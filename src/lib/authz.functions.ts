import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const appRoles = [
  "student",
  "volunteer",
  "organizer",
  "coordinator",
  "judge",
  "faculty",
  "admin",
] as const;
export type AppRole = (typeof appRoles)[number];

const scopes = ["global", "organization", "event"] as const;

// -----------------------------------------------------------
// checkPermission — server-side RBAC decision via public.can()
// -----------------------------------------------------------
export const checkPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        action: z.string().min(1).max(64),
        eventId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("can", {
      _uid: context.userId,
      _action: data.action,
      _event: data.eventId ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { allowed: !!result };
  });

// -----------------------------------------------------------
// getMyRoles — list caller's roles
// -----------------------------------------------------------
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("id, role, scope, scope_id, granted_at, expires_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// -----------------------------------------------------------
// listUsersWithRoles — admin only
// -----------------------------------------------------------
export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (pErr) throw new Error(pErr.message);

    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, scope, scope_id, expires_at");
    if (rErr) throw new Error(rErr.message);

    const byUser: Record<string, typeof roles> = {};
    for (const r of roles ?? []) {
      (byUser[r.user_id] ??= []).push(r);
    }
    return (profiles ?? []).map((p) => ({ ...p, roles: byUser[p.id] ?? [] }));
  });

// -----------------------------------------------------------
// assignRole — admin only. Grants a role to a user.
// -----------------------------------------------------------
export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(appRoles),
        scope: z.enum(scopes).default("global"),
        scopeId: z.string().uuid().nullable().optional(),
        expiresAt: z.string().datetime().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin only");

    if (data.scope === "global" && data.scopeId) throw new Error("Global roles have no scope_id");
    if (data.scope !== "global" && !data.scopeId) throw new Error("Scoped roles need a scope_id");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").insert({
      user_id: data.userId,
      role: data.role,
      scope: data.scope,
      scope_id: data.scopeId ?? null,
      granted_by: context.userId,
      expires_at: data.expiresAt ?? null,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "role.assigned",
      resource_type: "user_roles",
      resource_id: data.userId,
      metadata: {
        role: data.role,
        scope: data.scope,
        scope_id: data.scopeId ?? null,
        expires_at: data.expiresAt ?? null,
      },
    });
    return { ok: true };
  });

// -----------------------------------------------------------
// revokeRole — admin only.
// -----------------------------------------------------------
export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ roleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, scope, scope_id")
      .eq("id", data.roleId)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("user_roles").delete().eq("id", data.roleId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "role.revoked",
      resource_type: "user_roles",
      resource_id: data.roleId,
      metadata: row ?? {},
    });
    return { ok: true };
  });

// -----------------------------------------------------------
// delegatePermission — admin only for now (organizer/coordinator handled later)
// -----------------------------------------------------------
export const delegatePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        delegateUserId: z.string().uuid(),
        role: z.enum(appRoles),
        scope: z.enum(scopes),
        scopeId: z.string().uuid().nullable(),
        expiresAt: z.string().datetime(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin only");

    if (new Date(data.expiresAt) <= new Date()) throw new Error("expiresAt must be in the future");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("permission_delegations").insert({
      delegator_user_id: context.userId,
      delegate_user_id: data.delegateUserId,
      role: data.role,
      scope: data.scope,
      scope_id: data.scopeId,
      expires_at: data.expiresAt,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "permission.delegated",
      resource_type: "permission_delegations",
      resource_id: data.delegateUserId,
      metadata: data,
    });
    return { ok: true };
  });

// -----------------------------------------------------------
// getMyAuditLog — recent audit entries for the current user
// -----------------------------------------------------------
export const getMyAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("id, action, resource_type, resource_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
