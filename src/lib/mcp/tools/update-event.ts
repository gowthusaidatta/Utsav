import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "update_event",
  title: "Update event",
  description: "Update mutable event fields. Cannot change status; use publish_event/archive_event/cancel_event.",
  inputSchema: {
    event_id: z.string().uuid(),
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    category: z.string().trim().max(64).optional(),
    tags: z.array(z.string().trim().max(40)).max(20).optional(),
    start_at: z.string().datetime().nullable().optional(),
    end_at: z.string().datetime().nullable().optional(),
    venue: z.string().trim().max(200).nullable().optional(),
    is_online: z.boolean().optional(),
    meeting_url: z.string().url().max(500).nullable().optional(),
    capacity: z.number().int().min(1).max(100000).nullable().optional(),
    registration_deadline: z.string().datetime().nullable().optional(),
    is_paid: z.boolean().optional(),
    price: z.number().min(0).max(1000000).optional(),
    cover_image_url: z.string().url().max(500).nullable().optional(),
    visibility: z.enum(["public", "unlisted", "private"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { event_id, ...rest } = input;
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0) return ok({ updated: false });
    const { data, error } = await s.from("events").update(patch).eq("id", event_id).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, ctx.getUserId(), "event.update", "event", event_id, patch);
    return ok({ event: data });
  },
});
