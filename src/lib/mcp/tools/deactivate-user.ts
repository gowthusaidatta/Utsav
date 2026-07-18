import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, forbidden, mapDbError, hasGlobalRole, adminClient, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "deactivate_user",
  title: "Deactivate user",
  description: "Revoke ALL non-expired roles for a user, effectively removing app access. Admin-only. Does not delete the account.",
  inputSchema: { user_id: z.string().uuid(), reason: z.string().trim().max(500).optional() },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const actor = ctx.getUserId();
    if (!(await hasGlobalRole(s, actor, "admin"))) return forbidden("Admin role required.");
    if (input.user_id === actor) return forbidden("Cannot deactivate yourself.");

    const admin = await adminClient();
    const { data, error } = await admin.from("user_roles").delete().eq("user_id", input.user_id).select("id");
    if (error) return mapDbError(error);
    await recordAudit(s, actor, "user.deactivate", "user", input.user_id, { removed_roles: data?.length ?? 0, reason: input.reason ?? null });
    return ok({ deactivated: true, roles_removed: data?.length ?? 0 });
  },
});
