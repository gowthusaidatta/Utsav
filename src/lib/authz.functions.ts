import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
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

function requestMeta() {
  try {
    const req = getRequest();
    return {
      ip:
        req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req?.headers.get("x-real-ip") ||
        null,
      user_agent: req?.headers.get("user-agent") ?? null,
    };
  } catch {
    return { ip: null, user_agent: null };
  }
}

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
// getMyRoles — list caller's non-expired roles
// -----------------------------------------------------------
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("id, role, scope, scope_id, granted_at, expires_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const now = Date.now();
    return (data ?? []).filter(
      (r) => !r.expires_at || new Date(r.expires_at).getTime() > now,
    );
  });

// -----------------------------------------------------------
// listUsersWithRoles — admin only, with search + pagination
// -----------------------------------------------------------
export const listUsersWithRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().trim().max(120).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .optional()
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 200);
    if (data?.search) {
      const s = `%${data.search}%`;
      q = q.or(`email.ilike.${s},full_name.ilike.${s}`);
    }
    const { data: profiles, error: pErr } = await q;
    if (pErr) throw new Error(pErr.message);

    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, role, scope, scope_id, expires_at");
    if (rErr) throw new Error(rErr.message);

    const now = Date.now();
    const active = (roles ?? []).filter(
      (r) => !r.expires_at || new Date(r.expires_at).getTime() > now,
    );
    const byUser: Record<string, typeof active> = {};
    for (const r of active) (byUser[r.user_id] ??= []).push(r);
    return (profiles ?? []).map((p) => ({ ...p, roles: byUser[p.id] ?? [] }));
  });

// -----------------------------------------------------------
// assignRole — admin only
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

    if (data.scope === "global" && data.scopeId)
      throw new Error("Global roles have no scope_id");
    if (data.scope !== "global" && !data.scopeId)
      throw new Error("Scoped roles need a scope_id");

    const meta = requestMeta();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").insert({
      user_id: data.userId,
      role: data.role,
      scope: data.scope,
      scope_id: data.scopeId ?? null,
      granted_by: context.userId,
      expires_at: data.expiresAt ?? null,
    });
    if (error) {
      if ((error as { code?: string }).code === "23505")
        throw new Error("User already has this role");
      throw new Error(error.message);
    }

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
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// -----------------------------------------------------------
// revokeRole — admin only
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

    const meta = requestMeta();
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
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// -----------------------------------------------------------
// delegatePermission — admin only
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

    if (data.scope === "global" && data.scopeId)
      throw new Error("Global delegations have no scope_id");
    if (data.scope !== "global" && !data.scopeId)
      throw new Error("Scoped delegations need a scope_id");
    if (new Date(data.expiresAt) <= new Date())
      throw new Error("expiresAt must be in the future");

    const meta = requestMeta();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("permission_delegations")
      .insert({
        delegator_user_id: context.userId,
        delegate_user_id: data.delegateUserId,
        role: data.role,
        scope: data.scope,
        scope_id: data.scopeId,
        expires_at: data.expiresAt,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "permission.delegated",
      resource_type: "permission_delegations",
      resource_id: row.id,
      metadata: data,
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return row;
  });

// -----------------------------------------------------------
// revokeDelegation — admin or the delegator
// -----------------------------------------------------------
export const revokeDelegation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: fErr } = await supabaseAdmin
      .from("permission_delegations")
      .select("id, delegator_user_id, revoked_at")
      .eq("id", data.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!row) throw new Error("Delegation not found");
    if (row.revoked_at) throw new Error("Already revoked");

    const { data: isAdmin } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "admin",
    });
    if (!isAdmin && row.delegator_user_id !== context.userId)
      throw new Error("Forbidden");

    const meta = requestMeta();
    const { error } = await supabaseAdmin
      .from("permission_delegations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "permission.revoked",
      resource_type: "permission_delegations",
      resource_id: data.id,
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// -----------------------------------------------------------
// listMyDelegations — current user, incoming + outgoing
// -----------------------------------------------------------
export const listMyDelegations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [incoming, outgoing] = await Promise.all([
      context.supabase
        .from("permission_delegations")
        .select("id, role, scope, scope_id, granted_at, expires_at, revoked_at, delegator_user_id")
        .eq("delegate_user_id", context.userId)
        .order("granted_at", { ascending: false }),
      context.supabase
        .from("permission_delegations")
        .select("id, role, scope, scope_id, granted_at, expires_at, revoked_at, delegate_user_id")
        .eq("delegator_user_id", context.userId)
        .order("granted_at", { ascending: false }),
    ]);
    if (incoming.error) throw new Error(incoming.error.message);
    if (outgoing.error) throw new Error(outgoing.error.message);
    return { incoming: incoming.data ?? [], outgoing: outgoing.data ?? [] };
  });

// -----------------------------------------------------------
// listAllDelegations — admin
// -----------------------------------------------------------
export const listAllDelegations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("permission_delegations")
      .select(
        "id, role, scope, scope_id, granted_at, expires_at, revoked_at, delegator_user_id, delegate_user_id",
      )
      .order("granted_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// -----------------------------------------------------------
// getMyAuditLog
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
