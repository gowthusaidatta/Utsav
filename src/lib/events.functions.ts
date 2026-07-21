import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const eventStatuses = [
  "draft",
  "pending_approval",
  "published",
  "cancelled",
  "completed",
  "archived",
] as const;
type EventStatus = (typeof eventStatuses)[number];
const eventVisibilities = ["public", "private", "invite_only"] as const;

// Allowed status transitions. Faculty/admin can override with `bypass_transition_check`.
const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ["pending_approval", "published", "cancelled"],
  pending_approval: ["draft", "published", "cancelled"],
  published: ["cancelled", "completed", "archived"],
  cancelled: ["draft", "archived"],
  completed: ["archived"],
  archived: [],
};

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

function createServerPublicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const url = process.env.SUPABASE_URL!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const upsertSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(10_000).optional().nullable(),
  cover_image_url: z
    .string()
    .max(500)
    .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), {
      message: "Must be an absolute URL or a site-relative path",
    })
    .optional()
    .nullable(),
  category: z.string().trim().max(64).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(32)).max(20).optional(),
  status: z.enum(eventStatuses).optional(),
  visibility: z.enum(eventVisibilities).optional(),
  start_at: z.string().datetime().optional().nullable(),
  end_at: z.string().datetime().optional().nullable(),
  timezone: z.string().trim().max(64).optional(),
  venue: z.string().trim().max(240).optional().nullable(),
  is_online: z.boolean().optional(),
  meeting_url: z.string().url().max(500).optional().nullable(),
  capacity: z.number().int().positive().max(1_000_000).optional().nullable(),
  registration_deadline: z.string().datetime().optional().nullable(),
  is_paid: z.boolean().optional(),
  price: z.number().min(0).max(10_000_000).optional(),
  currency: z.string().trim().length(3).optional(),
  organization_id: z.string().uuid().optional().nullable(),
  registration_type: z.enum(["individual", "team"]).optional(),
  min_team_size: z.number().int().min(2).max(100).optional().nullable(),
  max_team_size: z.number().int().min(2).max(100).optional().nullable(),
  max_teams: z.number().int().min(1).max(10_000).optional().nullable(),
  team_config: z.record(z.string(), z.unknown()).optional(),
  attendance_rule: z.enum(["member", "leader", "all_members", "any_member"]).optional(),
  certificate_rule: z.enum(["attended", "registered", "winners", "top_performers", "custom"]).optional(),
});


// -------------------------------------------------------------------
// listPublicEvents — SSR-safe, published + public only
// -------------------------------------------------------------------
export const listPublicEvents = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        limit: z.number().int().min(1).max(50).optional(),
        category: z.string().trim().max(64).optional(),
        q: z.string().trim().max(120).optional(),
      })
      .optional()
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = createServerPublicClient();
    let q = supabase
      .from("events")
      .select(
        "id, title, slug, description, cover_image_url, category, tags, start_at, end_at, venue, is_online, is_paid, price, currency, capacity",
      )
      .eq("status", "published")
      .eq("visibility", "public")
      .order("start_at", { ascending: true, nullsFirst: false })
      .limit(data?.limit ?? 24);
    if (data?.category) q = q.eq("category", data.category);
    if (data?.q) {
      // Escape ILIKE wildcards from user input.
      const term = data.q.replace(/[%_]/g, (m) => `\\${m}`);
      q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
    }
    const { data: rows, error } = await q;
    if (error) return { events: [], error: error.message };
    return { events: rows ?? [] };
  });

// -------------------------------------------------------------------
// getEventBySlug — public read
// -------------------------------------------------------------------
export const getEventBySlug = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string().trim().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = createServerPublicClient();
    const { data: row, error } = await supabase
      .from("events")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// -------------------------------------------------------------------
// listMyEvents — authenticated, with optional status filter
// -------------------------------------------------------------------
export const listMyEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(eventStatuses).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .optional()
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("events")
      .select(
        "id, title, slug, status, visibility, start_at, end_at, category, is_paid, capacity, cover_image_url, created_by, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 200);
    if (data?.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// -------------------------------------------------------------------
// listPendingApproval — faculty/admin queue
// -------------------------------------------------------------------
export const listPendingApproval = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isFaculty } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "faculty",
    });
    const { data: isAdmin } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "admin",
    });
    if (!isFaculty && !isAdmin) throw new Error("Forbidden: faculty or admin only");
    const { data, error } = await context.supabase
      .from("events")
      .select(
        "id, title, slug, category, start_at, end_at, created_by, created_at, cover_image_url",
      )
      .eq("status", "pending_approval")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// -------------------------------------------------------------------
// getEventById — RLS-scoped
// -------------------------------------------------------------------
export const getEventById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Event not found or access denied");
    return row;
  });

// -------------------------------------------------------------------
// createEvent
// -------------------------------------------------------------------
export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    // RBAC: only admin/faculty/organizer/coordinator (or delegated) can create events.
    const { data: allowed, error: permErr } = await context.supabase.rpc("can", {
      _uid: context.userId,
      _action: "create_event",
    });
    if (permErr) throw new Error(permErr.message);
    if (!allowed)
      throw new Error(
        "Forbidden: your role does not permit creating events. Ask an admin for an organizer or coordinator role.",
      );
    // New events are always drafts — status/visibility come from lifecycle actions.
    const base = slugify(data.title) || "event";
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await context.supabase
        .from("events")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!exists) break;
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
    if (data.end_at && data.start_at && new Date(data.end_at) < new Date(data.start_at))
      throw new Error("End time must be after start time");

    const meta = requestMeta();
    const { data: row, error } = await context.supabase
      .from("events")
      .insert({
        title: data.title,
        slug,
        description: data.description ?? null,
        cover_image_url: data.cover_image_url ?? null,
        category: data.category ?? null,
        tags: data.tags ?? [],
        status: "draft",
        visibility: data.visibility ?? "public",
        start_at: data.start_at ?? null,
        end_at: data.end_at ?? null,
        timezone: data.timezone ?? "UTC",
        venue: data.venue ?? null,
        is_online: data.is_online ?? false,
        meeting_url: data.meeting_url ?? null,
        capacity: data.capacity ?? null,
        registration_deadline: data.registration_deadline ?? null,
        is_paid: data.is_paid ?? false,
        price: data.price ?? 0,
        currency: data.currency ?? "INR",
        organization_id: data.organization_id ?? null,
        created_by: context.userId,
        registration_type: data.registration_type ?? "individual",
        min_team_size: data.min_team_size ?? null,
        max_team_size: data.max_team_size ?? null,
        max_teams: data.max_teams ?? null,
        team_config: (data.team_config ?? {}) as never,
        attendance_rule: data.attendance_rule ?? "member",
        certificate_rule: data.certificate_rule ?? "attended",
      })
      .select("id, slug")
      .single();

    if (error) throw new Error(error.message);

    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "event.created",
      resource_type: "events",
      resource_id: row.id,
      metadata: { title: data.title, slug: row.slug },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return row;
  });

// -------------------------------------------------------------------
// updateEvent — enforces status transitions, drops status changes here
// -------------------------------------------------------------------
export const updateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid() })
      .merge(upsertSchema.partial())
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, status: _statusIgnored, ...patch } = data;
    if (patch.end_at && patch.start_at && new Date(patch.end_at) < new Date(patch.start_at))
      throw new Error("End time must be after start time");

    // Content-only update; status transitions go through changeEventStatus.
    const { error } = await context.supabase
      .from("events")
      .update(patch as never)
      .eq("id", id);
    if (error) throw new Error((error as { message: string }).message);

    const meta = requestMeta();
    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "event.updated",
      resource_type: "events",
      resource_id: id,
      metadata: patch as Record<string, unknown> as never,
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// -------------------------------------------------------------------
// changeEventStatus — validates transition + role + publish requirements
// -------------------------------------------------------------------
function validatePublishReadiness(row: {
  title: string;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  venue: string | null;
  is_online: boolean;
  meeting_url: string | null;
}) {
  const errs: string[] = [];
  if (!row.title || row.title.trim().length < 3) errs.push("Title is required");
  if (!row.description || row.description.trim().length < 20)
    errs.push("Description must be at least 20 characters");
  if (!row.start_at) errs.push("Start time is required");
  if (!row.end_at) errs.push("End time is required");
  if (row.start_at && row.end_at && new Date(row.end_at) < new Date(row.start_at))
    errs.push("End must be after start");
  if (row.is_online) {
    if (!row.meeting_url) errs.push("Meeting URL is required for online events");
  } else if (!row.venue) errs.push("Venue is required for in-person events");
  return errs;
}

export const changeEventStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        to: z.enum(eventStatuses),
        reason: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: current, error: fErr } = await context.supabase
      .from("events")
      .select(
        "id, status, title, description, start_at, end_at, venue, is_online, meeting_url, created_by",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!current) throw new Error("Event not found or access denied");

    const from = current.status as EventStatus;
    const to = data.to;
    if (from === to) return { ok: true };

    // Role checks.
    const { data: isAdmin } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "admin",
    });
    const { data: isFaculty } = await context.supabase.rpc("has_global_role", {
      _uid: context.userId,
      _role: "faculty",
    });
    const canApprove = !!(isAdmin || isFaculty);

    // Only faculty/admin (or the org's coordinator) can approve into `published`
    // from `pending_approval`. Direct draft→published is faculty/admin only.
    if (to === "published") {
      const { data: isCoordinator } = await context.supabase.rpc("has_role_in_event", {
        _uid: context.userId,
        _role: "coordinator",
        _event: data.id,
      });
      if (!canApprove && !isCoordinator)
        throw new Error("Only coordinators, faculty, or admin can publish an event");
    }

    // Admin/faculty can override transition table. Everyone else follows it.
    if (!canApprove) {
      const allowed = ALLOWED_TRANSITIONS[from] ?? [];
      if (!allowed.includes(to))
        throw new Error(`Cannot transition from ${from} to ${to}`);
    }

    if (to === "published") {
      const errs = validatePublishReadiness(current);
      if (errs.length > 0) throw new Error(`Cannot publish: ${errs.join("; ")}`);
    }

    const patch: Record<string, unknown> = { status: to };
    if (to === "published") patch.published_at = new Date().toISOString();

    const { error } = await context.supabase
      .from("events")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    const meta = requestMeta();
    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: `event.status.${to}`,
      resource_type: "events",
      resource_id: data.id,
      metadata: { from, to, reason: data.reason ?? null },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// -------------------------------------------------------------------
// deleteEvent — SOFT delete (sets deleted_at). RLS enforces edit rights.
// -------------------------------------------------------------------
export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        reason: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const meta = requestMeta();
    const { error } = await context.supabase
      .from("events")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: context.userId,
        delete_reason: data.reason ?? null,
      } as never)
      .eq("id", data.id)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "event.deleted",
      resource_type: "events",
      resource_id: data.id,
      metadata: { reason: data.reason ?? null },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// -------------------------------------------------------------------
// restoreEvent — admin only. Clears deleted_at.
// -------------------------------------------------------------------
export const restoreEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_any_global_role", {
      _uid: context.userId,
      _roles: ["admin", "platform_admin", "super_admin"],
    });
    if (!allowed) throw new Error("Forbidden: platform admin only");
    const { error } = await context.supabase
      .from("events")
      .update({ deleted_at: null, deleted_by: null, delete_reason: null } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    const meta = requestMeta();
    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "event.restored",
      resource_type: "events",
      resource_id: data.id,
      metadata: {},
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// -------------------------------------------------------------------
// purgeEvent — super admin only. Hard delete.
// -------------------------------------------------------------------
export const purgeEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_any_global_role", {
      _uid: context.userId,
      _roles: ["super_admin"],
    });
    if (!allowed) throw new Error("Forbidden: super admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const meta = requestMeta();
    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "event.purged",
      resource_type: "events",
      resource_id: data.id,
      metadata: {},
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true };
  });

// -------------------------------------------------------------------
// listDeletedEvents — platform admin only.
// -------------------------------------------------------------------
export const listDeletedEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed } = await context.supabase.rpc("has_any_global_role", {
      _uid: context.userId,
      _roles: ["admin", "platform_admin", "super_admin"],
    });
    if (!allowed) throw new Error("Forbidden: platform admin only");
    const { data, error } = await context.supabase
      .from("events")
      .select(
        "id, title, slug, status, deleted_at, deleted_by, delete_reason, cover_image_url, created_by, created_at",
      )
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// -------------------------------------------------------------------
// cancelEvent — proper cancellation with reason. Cancels active regs and
// notifies affected users. Escalates via service role after permission check.
// -------------------------------------------------------------------
export const cancelEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Permission gate via user-scoped client (RLS applies).
    const { data: current, error: fErr } = await context.supabase
      .from("events")
      .select("id, title, status, created_by")
      .eq("id", data.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!current) throw new Error("Event not found or access denied");
    if (current.status === "cancelled") return { ok: true, already: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();

    const { error: uErr } = await supabaseAdmin
      .from("events")
      .update({
        status: "cancelled",
        cancelled_at: nowIso,
        cancelled_by: context.userId,
        cancel_reason: data.reason,
      } as never)
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    // Cancel active registrations.
    const { data: regs } = await supabaseAdmin
      .from("registrations")
      .select("id, user_id")
      .eq("event_id", data.id)
      .in("status", ["registered", "checked_in"]);
    const affectedUserIds = Array.from(new Set((regs ?? []).map((r) => r.user_id)));
    if ((regs ?? []).length > 0) {
      await supabaseAdmin
        .from("registrations")
        .update({ status: "cancelled" } as never)
        .in("id", (regs ?? []).map((r) => r.id));
    }

    // Notify affected users.
    if (affectedUserIds.length > 0) {
      await supabaseAdmin.from("notifications").insert(
        affectedUserIds.map((uid) => ({
          recipient_user_id: uid,
          sender_user_id: context.userId,
          event_id: data.id,
          channel: "in_app",
          subject: `Event cancelled: ${current.title}`,
          body: data.reason,
          status: "sent",
          sent_at: nowIso,
        })) as never,
      );
    }

    const meta = requestMeta();
    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "event.cancelled",
      resource_type: "events",
      resource_id: data.id,
      metadata: { reason: data.reason, affected_users: affectedUserIds.length },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return { ok: true, affected: affectedUserIds.length };
  });

// -------------------------------------------------------------------
// duplicateEvent — clone an event as a new draft (owner or admin/faculty)
// -------------------------------------------------------------------
export const duplicateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: src, error: fErr } = await context.supabase
      .from("events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!src) throw new Error("Event not found or access denied");

    const base = slugify(`${src.title}-copy`) || "event-copy";
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const { data: exists } = await context.supabase
        .from("events")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!exists) break;
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data: row, error } = await context.supabase
      .from("events")
      .insert({
        title: `${src.title} (copy)`,
        slug,
        description: src.description,
        cover_image_url: src.cover_image_url,
        category: src.category,
        tags: src.tags,
        status: "draft",
        visibility: src.visibility,
        start_at: null,
        end_at: null,
        timezone: src.timezone,
        venue: src.venue,
        is_online: src.is_online,
        meeting_url: src.meeting_url,
        capacity: src.capacity,
        registration_deadline: null,
        is_paid: src.is_paid,
        price: src.price,
        currency: src.currency,
        organization_id: src.organization_id,
        created_by: context.userId,
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);

    const meta = requestMeta();
    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "event.duplicated",
      resource_type: "events",
      resource_id: row.id,
      metadata: { source_id: src.id },
      ip: meta.ip,
      user_agent: meta.user_agent,
    });
    return row;
  });
