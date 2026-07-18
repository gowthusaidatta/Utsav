import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, forbidden, mapDbError, hasGlobalRole, adminClient, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "revoke_role",
  title: "Revoke role",
  description: "Revoke a previously assigned role by its id. Admin-only for admin/faculty roles; faculty+admin otherwise.",
  inputSchema: { role_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const actor = ctx.getUserId();
    const isAdmin = await hasGlobalRole(s, actor, "admin");
    const isFaculty = await hasGlobalRole(s, actor, "faculty");
    if (!isAdmin && !isFaculty) return forbidden("Faculty or admin required.");

    const admin = await adminClient();
    const { data: existing, error: e1 } = await admin.from("user_roles").select("*").eq("id", input.role_id).maybeSingle();
    if (e1) return mapDbError(e1);
    if (!existing) return forbidden("Role not found.");
    if (!isAdmin && (existing.role === "admin" || existing.role === "faculty" || existing.scope === "global"))
      return forbidden("Only admin can revoke global/admin/faculty roles.");

    const { error } = await admin.from("user_roles").delete().eq("id", input.role_id);
    if (error) return mapDbError(error);
    await recordAudit(s, actor, "role.revoke", "user_role", input.role_id, existing);
    return ok({ revoked: true });
  },
});
