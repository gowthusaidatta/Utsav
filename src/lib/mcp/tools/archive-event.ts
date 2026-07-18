import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "archive_event",
  title: "Archive event",
  description: "Move an event to 'archived'. Requires coordinator/faculty/admin.",
  inputSchema: { event_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { data, error } = await s.from("events").update({ status: "archived" }).eq("id", input.event_id).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, ctx.getUserId(), "event.archive", "event", input.event_id);
    return ok({ event: data });
  },
});
