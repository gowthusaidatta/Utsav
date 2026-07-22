import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const appRoles = [
  "super_admin",
  "platform_admin",
  "admin",
  "org_admin",
  "college_admin",
  "dept_admin",
  "coordinator",
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

const userRow = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200).optional(),
  full_name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  college: z.string().trim().max(200).optional(),
  department: z.string().trim().max(200).optional(),
  roll_number: z.string().trim().max(80).optional(),
  faculty_id: z.string().trim().max(80).optional(),
  employee_id: z.string().trim().max(80).optional(),
  role: z.enum(appRoles).optional(),
});

async function assertManager(context: {
  userId: string;
  supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown; error: unknown }> };
}): Promise<number> {
  const { data, error } = await context.supabase.rpc("max_global_rank", { _uid: context.userId });
  if (error) throw new Error((error as { message?: string }).message || "rank check failed");
  const rank = (data as number) ?? 0;
  if (rank < 60) throw new Error("Forbidden: manager role required to create users");
  return rank;
}

function randomPassword() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 20) + "A1!";
}

async function createOne(
  input: z.infer<typeof userRow>,
  actorUserId: string,
  actorRank: number,
): Promise<{ email: string; ok: boolean; user_id?: string; error?: string; temp_password?: string }> {
  try {
    const parsed = userRow.parse(input);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = parsed.password || randomPassword();
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: parsed.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.full_name,
        phone: parsed.phone,
        college: parsed.college,
        department: parsed.department,
        roll_number: parsed.roll_number,
        faculty_id: parsed.faculty_id,
        employee_id: parsed.employee_id,
      },
    });
    if (cErr || !created?.user) throw new Error(cErr?.message || "Failed to create user");
    const uid = created.user.id;

    // Profile is created by handle_new_user trigger. Ensure protected identity fields exist.
    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: parsed.full_name ?? null,
        phone: parsed.phone ?? null,
        college: parsed.college ?? null,
        department: parsed.department ?? null,
        roll_number: parsed.roll_number ?? null,
        faculty_id: parsed.faculty_id ?? null,
        employee_id: parsed.employee_id ?? null,
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: actorUserId,
      })
      .eq("id", uid);

    // Assign role if provided and actor outranks it.
    if (parsed.role) {
      const ROLE_RANK: Record<string, number> = {
        super_admin: 100, admin: 100, platform_admin: 90, org_admin: 75, college_admin: 70,
        dept_admin: 60, coordinator: 50, student_coordinator: 40, organizer: 30, judge: 28,
        mentor: 28, finance: 28, media: 25, sponsor: 25, volunteer: 22, faculty: 20,
        student: 10, guest: 5,
      };
      if ((ROLE_RANK[parsed.role] ?? 0) < actorRank && parsed.role !== "admin") {
        await supabaseAdmin.from("user_roles").insert({
          user_id: uid,
          role: parsed.role,
          scope: "global",
          scope_id: null,
          granted_by: actorUserId,
        });
      }
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: actorUserId,
      action: "user.created_by_admin",
      resource_type: "profiles",
      resource_id: uid,
      metadata: { email: parsed.email, role: parsed.role ?? null },
    });

    return { email: parsed.email, ok: true, user_id: uid, temp_password: parsed.password ? undefined : password };
  } catch (e) {
    return { email: input?.email ?? "", ok: false, error: (e as Error).message };
  }
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => userRow.parse(input))
  .handler(async ({ data, context }) => {
    const rank = await assertManager(context as never);
    return await createOne(data, context.userId, rank);
  });

export const adminBulkCreateUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ users: z.array(userRow).min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const rank = await assertManager(context as never);
    const results: Array<Awaited<ReturnType<typeof createOne>>> = [];
    for (const u of data.users) {
      // sequential to avoid bursting auth.admin quota
      // eslint-disable-next-line no-await-in-loop
      results.push(await createOne(u, context.userId, rank));
    }
    return {
      total: results.length,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  });
