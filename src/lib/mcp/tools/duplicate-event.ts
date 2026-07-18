import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, notFound, mapDbError, recordAudit } from "../lib/supabase";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

export default defineTool({
  name: "duplicate_event",
  title: "Duplicate event",
  description: "Create a draft copy of an existing event. Registrations and teams are NOT copied.",
  inputSchema: { event_id: z.string().uuid(), new_title: z.string().trim().min(3).max(200).optional() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data: src, error } = await s.from("events").select("*").eq("id", input.event_id).maybeSingle();
    if (error) return mapDbError(error);
    if (!src) return notFound("Event");
    const title = input.new_title ?? `${src.title} (copy)`;
    const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error: e2 } = await s.from("events").insert({
      title, slug, description: src.description, category: src.category, tags: src.tags,
      venue: src.venue, is_online: src.is_online, meeting_url: src.meeting_url, capacity: src.capacity,
      is_paid: src.is_paid, price: src.price, currency: src.currency, organization_id: src.organization_id,
      visibility: src.visibility, cover_image_url: src.cover_image_url, timezone: src.timezone,
      status: "draft", created_by: uid,
    }).select().maybeSingle();
    if (e2) return mapDbError(e2);
    await recordAudit(s, uid, "event.duplicate", "event", data?.id, { source_id: input.event_id });
    return ok({ event: data });
  },
});
