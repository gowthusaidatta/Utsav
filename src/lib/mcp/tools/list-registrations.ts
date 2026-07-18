import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "list_registrations",
  title: "List event registrations",
  description: "List registrations for an event. Requires check-in or manage-teams permission (organizer/coordinator/volunteer/faculty/admin).",
  inputSchema: {
    event_id: z.string().uuid(),
    status: z.enum(["registered", "waitlist", "cancelled", "checked_in", "no_show"]).optional(),
    limit: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    let q = s.from("registrations")
      .select("id, event_id, user_id, team_id, status, payment_status, checked_in_at, notes, created_at")
      .eq("event_id", input.event_id).order("created_at", { ascending: false }).limit(input.limit ?? 100);
    if (input.status) q = q.eq("status", input.status);
    const { data, error } = await q;
    if (error) return mapDbError(error);
    return ok({ registrations: data ?? [] });
  },
});
