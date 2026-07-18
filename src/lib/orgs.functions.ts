import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();
const orgTypes = ["college", "department", "club", "company", "external"] as const;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

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

async function assertAdminOrFaculty(context: {
  supabase: ReturnType<typeof requireSupabaseAuth> extends never ? never : any;
  userId: string;
}) {
  const { data: isAdmin } = await context.supabase.rpc("has_global_role", {
    _uid: context.userId,
    _role: "admin",
  });
  if (isAdmin) return "admin";
  const { data: isFaculty } = await context.supabase.rpc("has_global_role", {
    _uid: context.userId,
    _role: "faculty",
  });
  if (isFaculty) return "faculty";
  throw new Error("Forbidden: admin or faculty only");
}

// ---------------------------------------------------------------
// listOrganizations — any authenticated user
// ---------------------------------------------------------------
export const listOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("organizations")
      .select("id, name, slug, type, parent_org_id, created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------------------------------------------------------------
// getOrganization — with members
// ---------------------------------------------------------------
export const getOrganization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: org, error } = await context.supabase
      .from("organizations")
      .select("id, name, slug, type, parent_org_id, created_by, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!org) throw new Error("Organization not found");

    const { data: members } = await context.supabase
      .from("org_members")
      .select("user_id, joined_at, user:profiles!org_members_user_id_fkey(id, full_name, email)")
      .eq("org_id", data.id);

    return { ...org, members: members ?? [] };
  });

// ---------------------------------------------------------------
// createOrganization — admin or faculty
// ---------------------------------------------------------------
export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(2).max(160),
        slug: z.string().trim().min(2).max(80).optional(),
        type: z.enum(orgTypes),
        parent_org_id: uuid.nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrFaculty(context);
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);
    if (!slug) throw new Error("Slug is required");

    const meta = requestMeta();
    const { data: row, error } = await context.supabase
      .from("organizations")
      .insert({
        name: data.name,
        slug,
        type: data.type,
        parent_org_id: data.parent_org_id ?? null,
        created_by: context.userId,
      })
      .select("id, name, slug, type")
      .single();
    if (error) {
      if ((error as { code?: string }).code === "23505")
        throw new Error("Slug already in use");
      throw new Error(error.message);
    }

    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "organization.created",
      resource_type: "organizations",
      resource_id: row.id,
      metadata: { name: row.name, slug: row.slug, type: row.type },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return row;
  });

// ---------------------------------------------------------------
// updateOrganization — admin or faculty
// ---------------------------------------------------------------
export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: uuid,
        name: z.string().trim().min(2).max(160).optional(),
        slug: z.string().trim().min(2).max(80).optional(),
        type: z.enum(orgTypes).optional(),
        parent_org_id: uuid.nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminOrFaculty(context);
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.slug !== undefined) patch.slug = slugify(data.slug);
    if (data.type !== undefined) patch.type = data.type;
    if (data.parent_org_id !== undefined) patch.parent_org_id = data.parent_org_id;
    if (Object.keys(patch).length === 0) return { ok: true };

    const meta = requestMeta();
    const { error } = await context.supabase
      .from("organizations")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "organization.updated",
      resource_type: "organizations",
      resource_id: data.id,
      metadata: patch,
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// ---------------------------------------------------------------
// deleteOrganization — admin only
// ---------------------------------------------------------------
export const deleteOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const meta = requestMeta();
    const { error } = await context.supabase
      .from("organizations")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "organization.deleted",
      resource_type: "organizations",
      resource_id: data.id,
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// ---------------------------------------------------------------
// addOrgMember — coordinator of org OR admin
// ---------------------------------------------------------------
export const addOrgMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ org_id: uuid, user_id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const meta = requestMeta();
    const { error } = await context.supabase
      .from("org_members")
      .insert({ org_id: data.org_id, user_id: data.user_id });
    if (error) {
      if ((error as { code?: string }).code === "23505")
        throw new Error("User is already a member");
      throw new Error(error.message);
    }
    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "org_member.added",
      resource_type: "org_members",
      resource_id: data.org_id,
      metadata: { user_id: data.user_id },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// ---------------------------------------------------------------
// removeOrgMember
// ---------------------------------------------------------------
export const removeOrgMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ org_id: uuid, user_id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const meta = requestMeta();
    const { error } = await context.supabase
      .from("org_members")
      .delete()
      .eq("org_id", data.org_id)
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "org_member.removed",
      resource_type: "org_members",
      resource_id: data.org_id,
      metadata: { user_id: data.user_id },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });
