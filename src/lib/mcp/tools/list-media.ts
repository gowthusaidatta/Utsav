import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, mapDbError, ok, adminClient } from "../lib/supabase";
import { signedDownloadUrl } from "../lib/media";

export default defineTool({
  name: "list_media",
  title: "List media",
  description: "List media assets scoped to an event, organization, or user. Returns rows visible under RLS and signed URLs.",
  inputSchema: {
    owner_type: z.enum(["event", "organization", "user"]).optional(),
    owner_id: z.string().uuid().optional(),
    event_id: z.string().uuid().optional(),
    kind: z.enum(["image", "video", "document"]).optional(),
    limit: z.number().int().min(1).max(200).default(50),
    include_urls: z.boolean().default(true),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    let q = supabase.from("media").select("*").order("created_at", { ascending: false }).limit(input.limit);
    if (input.owner_type) q = q.eq("owner_type", input.owner_type);
    if (input.owner_id) q = q.eq("owner_id", input.owner_id);
    if (input.event_id) q = q.eq("event_id", input.event_id);
    if (input.kind) q = q.eq("kind", input.kind);
    const { data, error } = await q;
    if (error) return mapDbError(error);

    let items = data ?? [];
    if (input.include_urls && items.length) {
      const admin = await adminClient();
      items = await Promise.all(items.map(async (m) => {
        const { url } = await signedDownloadUrl(admin, m.bucket, m.storage_path, 3600);
        return { ...m, download_url: url };
      }));
    }
    return ok({ items, count: items.length });
  },
});
