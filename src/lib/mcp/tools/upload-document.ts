import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  supabaseForUser, unauthenticated, invalidInput, forbidden, internalError,
  mapDbError, recordAudit, hasGlobalRole, ok, adminClient,
} from "../lib/supabase";
import {
  decodeBase64, sha256, detectMagicMime, scanBuffer,
  DOC_MIME, MAX_DOC_BYTES, extForMime, signedDownloadUrl,
} from "../lib/media";

export default defineTool({
  name: "upload_document",
  title: "Upload document",
  description: "Upload a document (PDF, Office, text) up to 25MB, base64-encoded. Returns metadata and signed download URL.",
  inputSchema: {
    filename: z.string().min(1).max(200),
    data_base64: z.string().min(4),
    mime_type: z.string().describe("application/pdf, docx, xlsx, pptx, text/plain, text/csv, text/markdown"),
    owner_type: z.enum(["event", "organization", "user"]),
    owner_id: z.string().uuid(),
    event_id: z.string().uuid().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const actor = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);

    if (!DOC_MIME.has(input.mime_type)) return invalidInput("Unsupported document MIME type.");

    let buf: Buffer;
    try { buf = decodeBase64(input.data_base64); }
    catch { return invalidInput("Invalid base64 payload."); }
    if (buf.length === 0) return invalidInput("Empty payload.");
    if (buf.length > MAX_DOC_BYTES) return invalidInput(`Document exceeds 25MB (${buf.length} bytes).`);

    const magic = detectMagicMime(buf);
    // Office/docx/xlsx/pptx are zip-wrapped; text/csv/md may have no magic.
    if (magic && magic !== "application/zip" && input.mime_type === "application/pdf" && magic !== "application/pdf") {
      return invalidInput(`Payload does not match declared MIME (detected ${magic}).`);
    }
    const scan = scanBuffer(buf);
    if (scan === "infected") return invalidInput("Payload rejected by malware scanner.");

    if (input.event_id) {
      const isAdmin = await hasGlobalRole(supabase, actor, "admin");
      const isFaculty = await hasGlobalRole(supabase, actor, "faculty");
      if (!isAdmin && !isFaculty) {
        const { data: org } = await supabase.rpc("has_role_in_event", { _uid: actor, _role: "organizer", _event: input.event_id });
        const { data: co } = await supabase.rpc("has_role_in_event", { _uid: actor, _role: "coordinator", _event: input.event_id });
        if (!org && !co) return forbidden("You cannot upload documents to this event.");
      }
    }

    const ext = extForMime(input.mime_type, "bin");
    const key = `${input.owner_type}/${input.owner_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const admin = await adminClient();
    const up = await admin.storage.from("media").upload(key, buf, { contentType: input.mime_type, upsert: false });
    if (up.error) return internalError(`Upload failed: ${up.error.message}`);

    const { data, error } = await supabase.from("media").insert({
      owner_type: input.owner_type,
      owner_id: input.owner_id,
      event_id: input.event_id ?? null,
      kind: "document",
      bucket: "media",
      storage_path: key,
      filename: input.filename,
      mime_type: input.mime_type,
      size_bytes: buf.length,
      checksum: sha256(buf),
      metadata: input.metadata ?? {},
      scan_status: scan,
      uploaded_by: actor,
    }).select("*").single();
    if (error) {
      await admin.storage.from("media").remove([key]);
      return mapDbError(error);
    }

    const { url } = await signedDownloadUrl(admin, "media", key, 3600);
    await recordAudit(supabase, actor, "media.upload_document", "media", data.id, { size: buf.length, mime: input.mime_type });
    return ok({ media: data, download_url: url, expires_in: 3600 });
  },
});
