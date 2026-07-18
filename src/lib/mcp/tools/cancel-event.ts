import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "cancel_event",
  title: "Cancel event",
  description: "Move an event to 'cancelled'. Requires coordinator/faculty/admin.",
  inputSchema: { event_id: z.string().uuid(), reason: z.string().trim().max(500).optional() },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { data, error } = await s.from("events").update({ status: "cancelled" }).eq("id", input.event_id).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, ctx.getUserId(), "event.cancel", "event", input.event_id, { reason: input.reason ?? null });
    return ok({ event: data });
  },
});
