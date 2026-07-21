import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PURSUIT_TYPES = [
  "certificate","course","internship","bootcamp","workshop","seminar",
  "conference","research","award","scholarship","publication","license",
  "project","patent","open_source","volunteer","leadership","work",
] as const;

const pursuitSchema = z.object({
  type: z.enum(PURSUIT_TYPES),
  title: z.string().trim().min(1).max(200),
  issuing_organization: z.string().trim().max(200).nullable().optional(),
  issue_date: z.string().date().nullable().optional(),
  expiry_date: z.string().date().nullable().optional(),
  credential_id: z.string().trim().max(120).nullable().optional(),
  credential_url: z.string().url().max(500).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  skills: z.array(z.string().trim().max(60)).max(60).optional(),
  attachments: z.array(z.object({ name: z.string(), url: z.string().url() })).max(20).optional(),
  verification_url: z.string().url().max(500).nullable().optional(),
  badge_url: z.string().url().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).max(1000).optional(),
});

export const listMyPursuits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_pursuits")
      .select("*")
      .eq("user_id", context.userId)
      .order("sort_order", { ascending: true })
      .order("issue_date", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPursuit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => pursuitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase.from("user_pursuits") as unknown as {
      insert: (v: Record<string, unknown>) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } };
    }).insert({ ...data, user_id: context.userId }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true as const, id: row?.id ?? "" };
  });

export const updatePursuit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), patch: pursuitSchema.partial() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("user_pursuits") as unknown as {
      update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } };
    }).update(data.patch).eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePursuit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_pursuits").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Combined view: manual pursuits + auto event certificates.
export const listMyCertificatesAll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [certsRes, eventsRes] = await Promise.all([
      context.supabase
        .from("certificates")
        .select("id, code, title, template_key, position, rank, score, role, event_id, issued_at, revoked_at, storage_path")
        .eq("user_id", context.userId)
        .order("issued_at", { ascending: false }),
      context.supabase.from("events").select("id, title, slug, start_at"),
    ]);
    if (certsRes.error) throw new Error(certsRes.error.message);
    const eventsById = new Map((eventsRes.data ?? []).map((e) => [e.id, e]));
    return (certsRes.data ?? []).map((c) => ({
      ...c,
      event: eventsById.get(c.event_id) ?? null,
      verify_url: `/verify/${c.code}`,
    }));
  });
