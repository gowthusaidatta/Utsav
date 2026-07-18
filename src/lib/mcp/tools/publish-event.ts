import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, notFound, invalidInput, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "publish_event",
  title: "Publish event",
  description: "Move an event to 'published'. Requires description, start/end times, and either venue or meeting URL. Requires coordinator/faculty/admin.",
  inputSchema: { event_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { data: ev, error } = await s.from("events").select("*").eq("id", input.event_id).maybeSingle();
    if (error) return mapDbError(error);
    if (!ev) return notFound("Event");
    if (!ev.description || !ev.start_at || !ev.end_at || (!ev.venue && !ev.meeting_url))
      return invalidInput("Event needs description, start/end times, and a venue or meeting URL to publish.");
    const { data, error: e2 } = await s.from("events")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", input.event_id).select().maybeSingle();
    if (e2) return mapDbError(e2);
    await recordAudit(s, ctx.getUserId(), "event.publish", "event", input.event_id);
    return ok({ event: data });
  },
});
