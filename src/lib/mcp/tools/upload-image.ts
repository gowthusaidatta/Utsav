import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  supabaseForUser, unauthenticated, invalidInput, forbidden, internalError,
  mapDbError, recordAudit, hasGlobalRole, ok, adminClient,
} from "../lib/supabase";
import {
  decodeBase64, sha256, detectMagicMime, scanBuffer,
  IMAGE_MIME, MAX_IMAGE_BYTES, extForMime, signedDownloadUrl,
} from "../lib/media";

async function canManageEvent(supabase: import("@supabase/supabase-js").SupabaseClient, uid: string, eventId: string | null) {
  if (!eventId) return true;
  if (await hasGlobalRole(supabase, uid, "admin")) return true;
  if (await hasGlobalRole(supabase, uid, "faculty")) return true;
  const { data: org } = await supabase.rpc("has_role_in_event", { _uid: uid, _role: "organizer", _event: eventId });
  const { data: co } = await supabase.rpc("has_role_in_event", { _uid: uid, _role: "coordinator", _event: eventId });
  return Boolean(org || co);
}

export default defineTool({
  name: "upload_image",
  title: "Upload image",
  description: "Upload an image (event cover, org logo, avatar) to the media bucket. Accepts base64-encoded data up to 10MB. Returns metadata and a signed download URL.",
  inputSchema: {
    filename: z.string().min(1).max(200).describe("Original filename with extension."),
    data_base64: z.string().min(4).describe("Base64-encoded image bytes. `data:` prefix accepted."),
    mime_type: z.string().min(3).describe("Declared MIME (image/jpeg, image/png, image/webp, image/gif, image/svg+xml, image/avif)."),
    owner_type: z.enum(["event", "organization", "user"]),
    owner_id: z.string().uuid(),
    event_id: z.string().uuid().optional().describe("Event to scope this asset to (for RBAC)."),
    metadata: z.record(z.string(), z.any()).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const actor = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);

    if (!IMAGE_MIME.has(input.mime_type)) return invalidInput("Unsupported image MIME type.");

    let buf: Buffer;
    try { buf = decodeBase64(input.data_base64); }
    catch { return invalidInput("Invalid base64 payload."); }
    if (buf.length === 0) return invalidInput("Empty payload.");
    if (buf.length > MAX_IMAGE_BYTES) return invalidInput(`Image exceeds 10MB (${buf.length} bytes).`);

    const magic = detectMagicMime(buf);
    if (magic && !IMAGE_MIME.has(magic)) return invalidInput(`Payload does not match declared MIME (detected ${magic}).`);

    const scan = scanBuffer(buf);
    if (scan === "infected") return invalidInput("Payload rejected by malware scanner.");

    if (input.event_id) {
      const allowed = await canManageEvent(supabase, actor, input.event_id);
      if (!allowed) return forbidden("You cannot upload media to this event.");
    }

    const ext = extForMime(input.mime_type, "img");
    const key = `${input.owner_type}/${input.owner_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    // Upload via admin client (bucket policies allow authenticated uploads but we need reliable owner assignment).
    const admin = await adminClient();
    const up = await admin.storage.from("media").upload(key, buf, { contentType: input.mime_type, upsert: false });
    if (up.error) return internalError(`Upload failed: ${up.error.message}`);

    const { data, error } = await supabase.from("media").insert({
      owner_type: input.owner_type,
      owner_id: input.owner_id,
      event_id: input.event_id ?? null,
      kind: "image",
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
    await recordAudit(supabase, actor, "media.upload_image", "media", data.id, { size: buf.length, mime: input.mime_type });
    return ok({ media: data, download_url: url, expires_in: 3600 });
  },
});
