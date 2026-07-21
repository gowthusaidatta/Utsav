import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const educationSchema = z.object({
  institution: z.string().trim().min(1).max(200),
  degree: z.string().trim().max(120).nullable().optional(),
  course: z.string().trim().max(160).nullable().optional(),
  branch: z.string().trim().max(160).nullable().optional(),
  specialization: z.string().trim().max(160).nullable().optional(),
  start_date: z.string().date().nullable().optional(),
  end_date: z.string().date().nullable().optional(),
  currently_studying: z.boolean().optional(),
  cgpa: z.number().min(0).max(10).nullable().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
  subjects: z.array(z.string().trim().max(80)).max(60).optional(),
  achievements: z.string().max(2000).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  transcript_url: z.string().url().max(500).nullable().optional(),
  documents: z.array(z.object({ name: z.string(), url: z.string().url() })).max(20).optional(),
  sort_order: z.number().int().min(0).max(1000).optional(),
});

export const listMyEducation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_education")
      .select("*")
      .eq("user_id", context.userId)
      .order("sort_order", { ascending: true })
      .order("start_date", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createEducation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => educationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase.from("user_education") as unknown as {
      insert: (v: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }> } };
    })
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as Record<string, unknown> | null;
  });

export const updateEducation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), patch: educationSchema.partial() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase.from("user_education") as unknown as {
      update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } };
    })
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEducation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_education")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderEducation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ order: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int().min(0) })).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    for (const it of data.order) {
      await (context.supabase.from("user_education") as unknown as {
        update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } };
      })
        .update({ sort_order: it.sort_order })
        .eq("id", it.id)
        .eq("user_id", context.userId);
    }
    return { ok: true };
  });
