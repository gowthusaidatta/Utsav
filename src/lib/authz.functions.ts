import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Full role list mirrors app_role enum.
const appRoles = [
  "super_admin",
  "platform_admin",
  "admin",
  "org_admin",
  "college_admin",
  "dept_admin",
  "coordinator", // Faculty Coordinator
  "student_coordinator",
  "organizer",
  "faculty",
  "judge",
  "mentor",
  "finance",
  "media",
  "sponsor",
  "volunteer",
  "student",
  "guest",
] as const;
export type AppRole = (typeof appRoles)[number];

const scopes = ["global", "organization", "event"] as const;

// Client-visible role rank table (kept in sync with SQL public.role_rank).
export const ROLE_RANK: Record<AppRole, number> = {
  super_admin: 100,
  admin: 100,
  platform_admin: 90,
  org_admin: 75,
  college_admin: 70,
  dept_admin: 60,
  coordinator: 50,
  student_coordinator: 40,
  organizer: 30,
  judge: 28,
  mentor: 28,
  finance: 28,
  media: 25,
  sponsor: 25,
  volunteer: 22,
  faculty: 20,
  student: 10,
  guest: 5,
};

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin (legacy)",
  platform_admin: "Platform Admin",
  org_admin: "Organization Admin",
  college_admin: "College Admin",
  dept_admin: "Department Admin",
  coordinator: "Faculty Coordinator",
  student_coordinator: "Student Coordinator",
  organizer: "Event Organizer",
  faculty: "Faculty",
  judge: "Judge",
  mentor: "Mentor",
  finance: "Finance",
  media: "Media",
  sponsor: "Sponsor",
  volunteer: "Volunteer",
  student: "Student",
  guest: "Guest",
};

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
// getMyRank — caller's max global role rank (0 if none)
// -----------------------------------------------------------
export const getMyRank = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("max_global_rank", {
      _uid: context.userId,
    });
    if (error) throw new Error(error.message);
    return { rank: (data as number) ?? 0 };
  });

// -----------------------------------------------------------
// getMyRoles
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
// Guard: caller must have some management rank (dept_admin+)
// -----------------------------------------------------------
async function requireManagerRank(context: {
  userId: string;
  supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown; error: unknown }> };
}): Promise<number> {
  const { data, error } = await context.supabase.rpc("max_global_rank", {
    _uid: context.userId,
  });
  if (error) throw new Error((error as { message?: string }).message || "rank check failed");
  const rank = (data as number) ?? 0;
  if (rank < ROLE_RANK.dept_admin) {
    throw new Error("Forbidden: manager role required");
  }
  return rank;
}

// -----------------------------------------------------------
// listUsersWithRoles — manager+ only
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actorRank = await requireManagerRank(context as any);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select(
        "id, email, full_name, is_active, created_at, verification_status, desired_role, roll_number, faculty_id, college, department",
      )
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

    return {
      actorRank,
      users: (profiles ?? []).map((p) => ({
        ...p,
        roles: byUser[p.id] ?? [],
      })),
    };
  });

// -----------------------------------------------------------
// assignRole — hierarchical
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
    // Self-protection: cannot assign to self (unless super_admin acting on someone else — never self).
    if (data.userId === context.userId) {
      throw new Error("You cannot assign a role to yourself");
    }

    // Rank: actor must strictly outrank the target role.
    const { data: canAssign, error: caErr } = await context.supabase.rpc(
      "can_assign_role",
      { _actor: context.userId, _target_role: data.role },
    );
    if (caErr) throw new Error(caErr.message);
    if (!canAssign) {
      throw new Error(
        "Forbidden: you may only assign roles strictly below your own rank",
      );
    }

    // Superior protection: actor must outrank the target user's current highest role.
    const { data: canManage, error: cmErr } = await context.supabase.rpc(
      "can_manage_user",
      { _actor: context.userId, _target: data.userId },
    );
    if (cmErr) throw new Error(cmErr.message);
    if (!canManage) {
      throw new Error("Forbidden: target user outranks you");
    }

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
// revokeRole — hierarchical
// -----------------------------------------------------------
export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ roleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, scope, scope_id")
      .eq("id", data.roleId)
      .maybeSingle();
    if (!row) throw new Error("Role not found");

    // Self-protection
    if (row.user_id === context.userId) {
      throw new Error(
        "You cannot revoke your own roles. Ask another admin.",
      );
    }

    // Rank: actor must outrank the role being revoked.
    const { data: canAssign } = await context.supabase.rpc("can_assign_role", {
      _actor: context.userId,
      _target_role: row.role,
    });
    if (!canAssign) throw new Error("Forbidden: role outranks you");

    // Superior protection: actor must outrank target user.
    const { data: canManage } = await context.supabase.rpc("can_manage_user", {
      _actor: context.userId,
      _target: row.user_id,
    });
    if (!canManage) throw new Error("Forbidden: target user outranks you");

    // Lockout guard for the last global super_admin/admin.
    if (
      (row.role === "super_admin" || row.role === "admin") &&
      row.scope === "global"
    ) {
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .in("role", ["super_admin", "admin"])
        .eq("scope", "global");
      if ((count ?? 0) <= 1) {
        throw new Error("Cannot revoke the last global super_admin role");
      }
    }

    const meta = requestMeta();
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("id", data.roleId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "role.revoked",
      resource_type: "user_roles",
      resource_id: data.roleId,
      metadata: row,
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// -----------------------------------------------------------
// delegatePermission — hierarchical, no self-delegation
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
    if (data.delegateUserId === context.userId) {
      throw new Error("You cannot delegate permissions to yourself");
    }
    const { data: canAssign } = await context.supabase.rpc("can_assign_role", {
      _actor: context.userId,
      _target_role: data.role,
    });
    if (!canAssign) {
      throw new Error(
        "Forbidden: you may only delegate roles strictly below your own rank",
      );
    }
    const { data: canManage } = await context.supabase.rpc("can_manage_user", {
      _actor: context.userId,
      _target: data.delegateUserId,
    });
    if (!canManage) throw new Error("Forbidden: target user outranks you");

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
    return { ok: true, id: row.id };
  });

// -----------------------------------------------------------
// Approval workflow
// -----------------------------------------------------------
export const listPendingApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await requireManagerRank(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, email, full_name, phone, college, department, roll_number, faculty_id, employee_id, designation, academic_year, desired_role, created_at",
      )
      .eq("verification_status", "pending")
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const approveUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(appRoles),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId)
      throw new Error("You cannot approve yourself");

    const { data: canAssign } = await context.supabase.rpc("can_assign_role", {
      _actor: context.userId,
      _target_role: data.role,
    });
    if (!canAssign)
      throw new Error(
        "Forbidden: you may only approve roles strictly below your own rank",
      );

    const meta = requestMeta();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("verification_status, desired_role, faculty_id, roll_number")
      .eq("id", data.userId)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found");
    if (profile.verification_status === "verified")
      throw new Error("User already verified");

    // Identity requirements
    if (
      (data.role === "faculty" || data.role === "coordinator") &&
      !profile.faculty_id
    )
      throw new Error("Faculty ID required for this role");
    if (data.role === "student_coordinator" && !profile.roll_number)
      throw new Error("Roll Number required for student coordinator");

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({
        verification_status: "verified",
        verified_by: context.userId,
        verified_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", data.userId);
    if (upErr) throw new Error(upErr.message);

    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: data.userId,
      role: data.role,
      scope: "global",
      granted_by: context.userId,
    });
    if (rErr && (rErr as { code?: string }).code !== "23505")
      throw new Error(rErr.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "account.approved",
      resource_type: "profiles",
      resource_id: data.userId,
      metadata: { role: data.role },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

export const rejectUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        reason: z.string().trim().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await requireManagerRank(context as any);
    if (data.userId === context.userId)
      throw new Error("You cannot reject yourself");

    const meta = requestMeta();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        verification_status: "rejected",
        verified_by: context.userId,
        verified_at: new Date().toISOString(),
        rejection_reason: data.reason,
      })
      .eq("id", data.userId)
      .eq("verification_status", "pending");
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "account.rejected",
      resource_type: "profiles",
      resource_id: data.userId,
      metadata: { reason: data.reason },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// -----------------------------------------------------------
// verifyMyPermissions — probe several actions in one call
// -----------------------------------------------------------
export const verifyMyPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        actions: z.array(z.string().min(1).max(64)).min(1).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const out: Record<string, boolean> = {};
    for (const a of data.actions) {
      const { data: r } = await context.supabase.rpc("can", {
        _uid: context.userId,
        _action: a,
        _event: undefined,
      });
      out[a] = !!r;
    }
    return out;
  });
