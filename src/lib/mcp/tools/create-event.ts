import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

export default defineTool({
  name: "create_event",
  title: "Create event",
  description: "Create a new event draft. Alias of create_event_draft with a broader field set.",
  inputSchema: {
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(5000).optional(),
    category: z.string().trim().max(64).optional(),
    tags: z.array(z.string().trim().max(40)).max(20).optional(),
    start_at: z.string().datetime().optional(),
    end_at: z.string().datetime().optional(),
    venue: z.string().trim().max(200).optional(),
    is_online: z.boolean().optional(),
    meeting_url: z.string().url().max(500).optional(),
    capacity: z.number().int().min(1).max(100000).optional(),
    is_paid: z.boolean().optional(),
    price: z.number().min(0).max(1000000).optional(),
    organization_id: z.string().uuid().optional(),
    visibility: z.enum(["public", "unlisted", "private"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const slug = `${slugify(input.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await s.from("events").insert({
      title: input.title, slug,
      description: input.description ?? null, category: input.category ?? null,
      tags: input.tags ?? [], start_at: input.start_at ?? null, end_at: input.end_at ?? null,
      venue: input.venue ?? null, is_online: input.is_online ?? false, meeting_url: input.meeting_url ?? null,
      capacity: input.capacity ?? null, is_paid: input.is_paid ?? false, price: input.price ?? 0,
      organization_id: input.organization_id ?? null, visibility: input.visibility ?? "public",
      status: "draft", created_by: uid,
    }).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, uid, "event.create", "event", data?.id);
    return ok({ event: data });
  },
});
