import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "delete_event",
  title: "Delete event",
  description: "Permanently delete an event and all its registrations and teams. Faculty/admin only (enforced by RLS).",
  inputSchema: { event_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { error } = await s.from("events").delete().eq("id", input.event_id);
    if (error) return mapDbError(error);
    await recordAudit(s, ctx.getUserId(), "event.delete", "event", input.event_id);
    return ok({ deleted: true });
  },
});
