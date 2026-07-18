import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, forbidden, mapDbError, hasGlobalRole, adminClient, recordAudit } from "../lib/supabase";

const ROLES = ["volunteer", "organizer", "coordinator", "judge"] as const;

export default defineTool({
  name: "delegate_permission",
  title: "Delegate permission",
  description: "Time-boxed delegation of an event-scoped role to another user. Requires faculty/admin or being an existing coordinator of the event.",
  inputSchema: {
    delegate_user_id: z.string().uuid(),
    role: z.enum(ROLES),
    event_id: z.string().uuid(),
    expires_at: z.string().datetime(),
    reason: z.string().trim().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const actor = ctx.getUserId();
    const isAdmin = await hasGlobalRole(s, actor, "admin");
    const isFaculty = await hasGlobalRole(s, actor, "faculty");
    let allowed = isAdmin || isFaculty;
    if (!allowed) {
      const { data } = await s.rpc("has_role_in_event", { _uid: actor, _role: "coordinator", _event: input.event_id });
      allowed = Boolean(data);
    }
    if (!allowed) return forbidden("Faculty, admin, or event coordinator required.");
    if (new Date(input.expires_at) <= new Date()) return forbidden("expires_at must be in the future.");

    const admin = await adminClient();
    const { data, error } = await admin.from("permission_delegations").insert({
      delegator_user_id: actor!,
      delegate_user_id: input.delegate_user_id,
      role: input.role,
      scope: "event",
      scope_id: input.event_id,
      expires_at: input.expires_at,
      reason: input.reason ?? null,
    }).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, actor, "permission.delegate", "delegation", data?.id, { target: input.delegate_user_id, role: input.role, event_id: input.event_id });
    return ok({ delegated: true, delegation: data });
  },
});
