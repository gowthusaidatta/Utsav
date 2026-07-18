import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, forbidden, mapDbError, hasGlobalRole, adminClient, recordAudit } from "../lib/supabase";

const ROLES = ["student", "volunteer", "organizer", "coordinator", "judge", "faculty", "admin"] as const;
const SCOPES = ["global", "organization", "event"] as const;

export default defineTool({
  name: "assign_role",
  title: "Assign role",
  description: "Grant a role to a user. Admin-only for global/admin/faculty; faculty or admin for organization/event scopes.",
  inputSchema: {
    user_id: z.string().uuid(),
    role: z.enum(ROLES),
    scope: z.enum(SCOPES),
    scope_id: z.string().uuid().optional(),
    expires_at: z.string().datetime().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const actor = ctx.getUserId();
    const isAdmin = await hasGlobalRole(s, actor, "admin");
    const isFaculty = await hasGlobalRole(s, actor, "faculty");
    if (!isAdmin && !isFaculty) return forbidden("Faculty or admin required.");
    if (!isAdmin && (input.role === "admin" || input.role === "faculty" || input.scope === "global"))
      return forbidden("Only admin can assign global/admin/faculty roles.");
    if (input.scope !== "global" && !input.scope_id) return forbidden("scope_id required for non-global scope.");

    const admin = await adminClient();
    const { data, error } = await admin.from("user_roles").insert({
      user_id: input.user_id,
      role: input.role,
      scope: input.scope,
      scope_id: input.scope === "global" ? null : input.scope_id,
      granted_by: actor,
      expires_at: input.expires_at ?? null,
    }).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, actor, "role.assign", "user_role", data?.id, {
      target: input.user_id, role: input.role, scope: input.scope, scope_id: input.scope_id ?? null,
    });
    return ok({ assigned: true, role: data });
  },
});
