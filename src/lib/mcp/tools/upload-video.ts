import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  supabaseForUser, unauthenticated, invalidInput, forbidden, internalError,
  mapDbError, recordAudit, hasGlobalRole, ok, adminClient,
} from "../lib/supabase";
import {
  decodeBase64, sha256, detectMagicMime, scanBuffer,
  VIDEO_MIME, MAX_VIDEO_BYTES, extForMime, signedDownloadUrl,
} from "../lib/media";

export default defineTool({
  name: "upload_video",
  title: "Upload video",
  description: "Upload a video asset (up to 200MB, base64-encoded). Video preview URL available via signed download.",
  inputSchema: {
    filename: z.string().min(1).max(200),
    data_base64: z.string().min(4),
    mime_type: z.string().describe("video/mp4, video/webm, video/quicktime, or video/x-matroska"),
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

    if (!VIDEO_MIME.has(input.mime_type)) return invalidInput("Unsupported video MIME type.");

    let buf: Buffer;
    try { buf = decodeBase64(input.data_base64); }
    catch { return invalidInput("Invalid base64 payload."); }
    if (buf.length === 0) return invalidInput("Empty payload.");
    if (buf.length > MAX_VIDEO_BYTES) return invalidInput(`Video exceeds 200MB (${buf.length} bytes).`);

    const magic = detectMagicMime(buf);
    if (magic && !VIDEO_MIME.has(magic) && magic !== "application/zip") {
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
        if (!org && !co) return forbidden("You cannot upload video to this event.");
      }
    }

    const ext = extForMime(input.mime_type, "mp4");
    const key = `${input.owner_type}/${input.owner_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const admin = await adminClient();
    const up = await admin.storage.from("media").upload(key, buf, { contentType: input.mime_type, upsert: false });
    if (up.error) return internalError(`Upload failed: ${up.error.message}`);

    const { data, error } = await supabase.from("media").insert({
      owner_type: input.owner_type,
      owner_id: input.owner_id,
      event_id: input.event_id ?? null,
      kind: "video",
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
    await recordAudit(supabase, actor, "media.upload_video", "media", data.id, { size: buf.length, mime: input.mime_type });
    return ok({ media: data, preview_url: url, expires_in: 3600 });
  },
});
