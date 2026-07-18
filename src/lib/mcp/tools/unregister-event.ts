import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "unregister_event",
  title: "Unregister from event",
  description: "Cancel the signed-in user's registration for an event.",
  inputSchema: { event_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data, error } = await s.from("registrations")
      .update({ status: "cancelled" })
      .eq("event_id", input.event_id).eq("user_id", uid).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, uid, "registration.cancel", "registration", data?.id, { event_id: input.event_id });
    return ok({ cancelled: true, registration: data });
  },
});
