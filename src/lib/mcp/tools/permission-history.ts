import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, forbidden, mapDbError, hasGlobalRole } from "../lib/supabase";

export default defineTool({
  name: "permission_history",
  title: "Permission history",
  description: "Role and delegation grant/revoke history for a user. Admin, or the user themselves.",
  inputSchema: { user_id: z.string().uuid(), limit: z.number().int().min(1).max(500).optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const self = ctx.getUserId();
    if (input.user_id !== self && !(await hasGlobalRole(s, self, "admin"))) return forbidden();
    const { data, error } = await s.from("audit_logs").select("*")
      .in("action", ["role.assign", "role.revoke", "permission.delegate", "user.deactivate"])
      .or(`actor_user_id.eq.${input.user_id},resource_id.eq.${input.user_id}`)
      .order("created_at", { ascending: false }).limit(input.limit ?? 100);
    if (error) return mapDbError(error);
    return ok({ user_id: input.user_id, entries: data ?? [] });
  },
});
