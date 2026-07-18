import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  supabaseForUser, unauthenticated, forbidden, notFound, mapDbError,
  recordAudit, hasGlobalRole, ok, adminClient,
} from "../lib/supabase";
import { signedDownloadUrl } from "../lib/media";

export default defineTool({
  name: "download_certificate",
  title: "Download certificate",
  description: "Return a signed download URL for a certificate PDF. Recipients can download their own; organizers/coordinators/admins can download any.",
  inputSchema: {
    code: z.string().min(6).max(64).optional(),
    id: z.string().uuid().optional(),
    expires_in: z.number().int().min(60).max(86400).default(3600),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const actor = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);

    if (!input.code && !input.id) return forbidden("Provide either `code` or `id`.");
    let q = supabase.from("certificates").select("id, code, user_id, event_id, storage_path, revoked_at");
    q = input.id ? q.eq("id", input.id) : q.eq("code", input.code!);
    const { data, error } = await q.maybeSingle();
    if (error) return mapDbError(error);
    if (!data) return notFound("Certificate");
    if (!data.storage_path) return notFound("Certificate PDF");

    const isRecipient = data.user_id === actor;
    let canDownload = isRecipient;
    if (!canDownload) {
      canDownload = await hasGlobalRole(supabase, actor, "admin") || await hasGlobalRole(supabase, actor, "faculty");
    }
    if (!canDownload) {
      const { data: org } = await supabase.rpc("has_role_in_event", { _uid: actor, _role: "organizer", _event: data.event_id });
      const { data: co } = await supabase.rpc("has_role_in_event", { _uid: actor, _role: "coordinator", _event: data.event_id });
      canDownload = Boolean(org || co);
    }
    if (!canDownload) return forbidden("You cannot download this certificate.");

    const admin = await adminClient();
    const { url, error: sErr } = await signedDownloadUrl(admin, "certificates", data.storage_path, input.expires_in);
    if (sErr || !url) return mapDbError(sErr as { message?: string; code?: string });

    await recordAudit(supabase, actor, "certificate.download", "certificate", data.id);
    return ok({
      certificate_id: data.id,
      code: data.code,
      download_url: url,
      expires_in: input.expires_in,
      revoked: Boolean(data.revoked_at),
    });
  },
});
