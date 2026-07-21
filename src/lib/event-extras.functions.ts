import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

// ---------------- FAQs ----------------
export const listEventFaqs = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ event_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const s = createServerPublicClient();
    const { data: rows, error } = await s
      .from("event_faqs")
      .select("id, question, answer, sort_order")
      .eq("event_id", data.event_id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) return [];
    return rows ?? [];
  });

export const upsertEventFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        event_id: z.string().uuid(),
        question: z.string().trim().min(3).max(300),
        answer: z.string().trim().min(1).max(4000),
        sort_order: z.number().int().min(0).max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase
        .from("event_faqs")
        .update({
          question: data.question,
          answer: data.answer,
          sort_order: data.sort_order ?? 0,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("event_faqs")
      .insert({
        event_id: data.event_id,
        question: data.question,
        answer: data.answer,
        sort_order: data.sort_order ?? 0,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteEventFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("event_faqs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Announcements ----------------
export const listEventAnnouncements = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ event_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const s = createServerPublicClient();
    const { data: rows, error } = await s
      .from("event_announcements")
      .select("id, title, body, is_pinned, created_at")
      .eq("event_id", data.event_id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return [];
    return rows ?? [];
  });

export const upsertEventAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        event_id: z.string().uuid(),
        title: z.string().trim().min(3).max(200),
        body: z.string().trim().min(1).max(10_000),
        is_pinned: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase
        .from("event_announcements")
        .update({
          title: data.title,
          body: data.body,
          is_pinned: data.is_pinned ?? false,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("event_announcements")
      .insert({
        event_id: data.event_id,
        title: data.title,
        body: data.body,
        is_pinned: data.is_pinned ?? false,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteEventAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("event_announcements")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Feedback / Ratings ----------------
export const getEventFeedbackSummary = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ event_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const s = createServerPublicClient();
    const { data: rows, error } = await s
      .from("event_feedback")
      .select("rating")
      .eq("event_id", data.event_id);
    if (error || !rows) return { count: 0, average: 0 };
    if (rows.length === 0) return { count: 0, average: 0 };
    const sum = rows.reduce((a, r) => a + (r.rating ?? 0), 0);
    return { count: rows.length, average: Math.round((sum / rows.length) * 10) / 10 };
  });

export const listEventFeedback = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({
        event_id: z.string().uuid(),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const s = createServerPublicClient();
    const { data: rows, error } = await s
      .from("event_feedback")
      .select("id, rating, comment, created_at, user_id")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 20);
    if (error) return [];
    return rows ?? [];
  });

export const getMyFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ event_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("event_feedback")
      .select("id, rating, comment")
      .eq("event_id", data.event_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    return row;
  });

export const upsertMyFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        event_id: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("event_feedback").upsert(
      {
        event_id: data.event_id,
        user_id: context.userId,
        rating: data.rating,
        comment: data.comment ?? null,
      },
      { onConflict: "event_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ event_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("event_feedback")
      .delete()
      .eq("event_id", data.event_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
