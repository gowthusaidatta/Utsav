import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  supabaseForUser, unauthenticated, notFound, mapDbError,
  recordAudit, ok, adminClient,
} from "../lib/supabase";

export default defineTool({
  name: "delete_media",
  title: "Delete media",
  description: "Delete a media asset by id. Requires uploader ownership, event manager role, or admin.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const actor = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);

    // RLS enforces permission on the DELETE below; fetch first for storage cleanup.
    const { data, error } = await supabase.from("media").select("id, bucket, storage_path, thumbnail_path").eq("id", id).maybeSingle();
    if (error) return mapDbError(error);
    if (!data) return notFound("Media");

    const { error: delErr } = await supabase.from("media").delete().eq("id", id);
    if (delErr) return mapDbError(delErr);

    // Row deleted under RLS → we're authorized to remove the object too.
    const admin = await adminClient();
    const paths = [data.storage_path, data.thumbnail_path].filter(Boolean) as string[];
    if (paths.length) await admin.storage.from(data.bucket).remove(paths);

    await recordAudit(supabase, actor, "media.delete", "media", id);
    return ok({ deleted: true, id });
  },
});
