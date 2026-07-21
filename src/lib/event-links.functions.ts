import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
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

const linkSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  url: z.string().trim().url().max(1000),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export const listEventLinks = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ event_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    // Public read via anon SELECT policy for published/public events; also
    // works for editors via same policy exposure server-side is fine.
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("event_links")
      .select("id, title, description, url, sort_order, click_count")
      .eq("event_id", data.event_id)
      .order("sort_order", { ascending: true });
    if (error) return [];
    return rows ?? [];
  });

export const listEventLinksForEditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ event_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("event_links")
      .select("id, title, description, url, sort_order, click_count")
      .eq("event_id", data.event_id)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createEventLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ event_id: z.string().uuid() }).merge(linkSchema).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { count } = await context.supabase
      .from("event_links")
      .select("id", { count: "exact", head: true })
      .eq("event_id", data.event_id);
    if ((count ?? 0) >= 50) throw new Error("Maximum of 50 links per event");
    const { data: row, error } = await context.supabase
      .from("event_links")
      .insert({
        event_id: data.event_id,
        title: data.title,
        description: data.description ?? null,
        url: data.url,
        sort_order: data.sort_order ?? (count ?? 0),
        created_by: context.userId,
      } as never)
      .select("id, title, description, url, sort_order, click_count")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateEventLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid() })
      .merge(linkSchema.partial())
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("event_links")
      .update(patch as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEventLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("event_links")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderEventLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        event_id: z.string().uuid(),
        order: z.array(z.string().uuid()).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    for (let i = 0; i < data.order.length; i++) {
      const { error } = await context.supabase
        .from("event_links")
        .update({ sort_order: i } as never)
        .eq("id", data.order[i])
        .eq("event_id", data.event_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
