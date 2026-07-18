import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "current_permissions",
  title: "Current permissions",
  description: "Return the set of Utsav actions the signed-in user can perform globally and on any events they staff.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const globalActions = ["view_event", "register", "create_team", "submit_project", "manage_users"];
    const results: Record<string, boolean> = {};
    for (const a of globalActions) {
      const { data } = await s.rpc("can", { _uid: uid, _action: a, _event: null });
      results[a] = Boolean(data);
    }
    const { data: roles, error } = await s
      .from("user_roles")
      .select("role, scope, scope_id, expires_at")
      .eq("user_id", uid);
    if (error) return mapDbError(error);
    return ok({ user_id: uid, global_actions: results, roles: roles ?? [] });
  },
});
