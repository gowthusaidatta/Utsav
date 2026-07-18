import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "dashboard_metrics",
  title: "Dashboard metrics",
  description: "Signed-in user's dashboard totals: events I created, my registrations, my teams, and pending approvals visible to me.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_i, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const [myEvents, myRegs, myTeams, pending] = await Promise.all([
      s.from("events").select("id", { count: "exact", head: true }).eq("created_by", uid),
      s.from("registrations").select("id", { count: "exact", head: true }).eq("user_id", uid),
      s.from("team_members").select("team_id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "active"),
      s.from("events").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
    ]);
    if (myEvents.error) return mapDbError(myEvents.error);
    return ok({
      events_created: myEvents.count ?? 0,
      registrations: myRegs.count ?? 0,
      teams: myTeams.count ?? 0,
      pending_approvals_visible: pending.count ?? 0,
    });
  },
});
