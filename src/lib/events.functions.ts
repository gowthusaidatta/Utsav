import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
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
const eventVisibilities = ["public", "private", "invite_only"] as const;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

const upsertSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(10_000).optional().nullable(),
  cover_image_url: z.string().url().max(500).optional().nullable(),
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
});

// -------------------------------------------------------------------
// listPublicEvents — SSR-safe, published + public only, no bearer needed
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
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const url = process.env.SUPABASE_URL!;
    const supabase = createClient(url, key, {
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
    if (data?.q) q = q.ilike("title", `%${data.q}%`);
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
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(process.env.SUPABASE_URL!, key, {
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
    const { data: row, error } = await supabase
      .from("events")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// -------------------------------------------------------------------
// listMyEvents — creator + event-staff scoped, requires auth
// -------------------------------------------------------------------
export const listMyEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // RLS returns everything the user is allowed to see. Order client-side.
    const { data, error } = await context.supabase
      .from("events")
      .select(
        "id, title, slug, status, visibility, start_at, end_at, category, is_paid, capacity, created_by, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// -------------------------------------------------------------------
// getEventById — authenticated view (owner/staff/faculty/admin)
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
// createEvent — any signed-in user; starts as draft
// -------------------------------------------------------------------
export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Ensure unique slug
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

    const insertRow: Record<string, unknown> = {
      title: data.title,
      slug,
      description: data.description ?? null,
      cover_image_url: data.cover_image_url ?? null,
      category: data.category ?? null,
      tags: data.tags ?? [],
      status: data.status ?? "draft",
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
    };

    const { data: row, error } = await context.supabase
      .from("events")
      .insert(insertRow)
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "event.created",
      resource_type: "events",
      resource_id: row.id,
      metadata: { title: data.title, slug: row.slug },
    });
    return row;
  });

// -------------------------------------------------------------------
// updateEvent — RLS enforces authorization
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
    const { id, ...patch } = data;
    const update: Record<string, unknown> = { ...patch };
    if (patch.status === "published") update.published_at = new Date().toISOString();

    const { error } = await context.supabase.from("events").update(update).eq("id", id);
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "event.updated",
      resource_type: "events",
      resource_id: id,
      metadata: patch,
    });
    return { ok: true };
  });

// -------------------------------------------------------------------
// deleteEvent — faculty/admin (RLS enforces)
// -------------------------------------------------------------------
export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "event.deleted",
      resource_type: "events",
      resource_id: data.id,
      metadata: {},
    });
    return { ok: true };
  });
