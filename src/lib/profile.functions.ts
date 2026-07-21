import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROFILE_COLUMNS = `
  id, email, full_name, display_name, username, avatar_url, cover_url, phone, alternate_phone,
  gender, date_of_birth, bio, languages, nationality, blood_group,
  address_country, address_state, address_district, address_city, address_postal_code, timezone,
  college, campus, department, course, branch, specialization,
  roll_number, registration_number, academic_year, section, semester, current_year,
  expected_graduation, student_id, faculty_id, employee_id, admission_year, current_status,
  designation, current_position, organization_name, experience_years,
  technical_skills, soft_skills, resume_url, portfolio_url, personal_website,
  linkedin_url, github_url, twitter_url, instagram_url, facebook_url, discord_username,
  leetcode_username, codeforces_username, codechef_username, hackerrank_username, gfg_username,
  researchgate_url, orcid,
  field_visibility, profile_is_public,
  is_active, verification_status, verified_at, created_at
`;

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const nullableString = (max: number) =>
  z.string().trim().max(max).nullable().optional().or(z.literal("").transform(() => null));
const nullableUrl = (max = 500) =>
  z.union([z.string().url().max(max), z.literal(""), z.null()]).optional().transform((v) => (v ? v : null));

const profilePatchSchema = z.object({
  full_name: nullableString(120),
  display_name: nullableString(120),
  phone: nullableString(32),
  alternate_phone: nullableString(32),
  gender: nullableString(32),
  date_of_birth: z.string().date().nullable().optional().or(z.literal("").transform(() => null)),
  bio: nullableString(2000),
  languages: z.array(z.string().trim().max(60)).max(30).optional(),
  nationality: nullableString(80),
  blood_group: nullableString(8),
  address_country: nullableString(80),
  address_state: nullableString(80),
  address_district: nullableString(80),
  address_city: nullableString(80),
  address_postal_code: nullableString(20),
  timezone: nullableString(80),
  college: nullableString(160),
  campus: nullableString(160),
  department: nullableString(160),
  course: nullableString(160),
  branch: nullableString(160),
  specialization: nullableString(160),
  registration_number: nullableString(80),
  academic_year: nullableString(40),
  section: nullableString(40),
  semester: nullableString(40),
  current_year: nullableString(40),
  expected_graduation: nullableString(40),
  student_id: nullableString(80),
  admission_year: nullableString(40),
  designation: nullableString(160),
  current_position: nullableString(160),
  organization_name: nullableString(160),
  experience_years: z.number().min(0).max(80).nullable().optional(),
  technical_skills: z.array(z.string().trim().max(60)).max(60).optional(),
  soft_skills: z.array(z.string().trim().max(60)).max(60).optional(),
  avatar_url: nullableUrl(),
  cover_url: nullableUrl(),
  resume_url: nullableUrl(),
  portfolio_url: nullableUrl(),
  personal_website: nullableUrl(),
  linkedin_url: nullableUrl(),
  github_url: nullableUrl(),
  twitter_url: nullableUrl(),
  instagram_url: nullableUrl(),
  facebook_url: nullableUrl(),
  discord_username: nullableString(80),
  leetcode_username: nullableString(80),
  codeforces_username: nullableString(80),
  codechef_username: nullableString(80),
  hackerrank_username: nullableString(80),
  gfg_username: nullableString(80),
  researchgate_url: nullableUrl(),
  orcid: nullableString(40),
  field_visibility: z.record(z.string(), z.enum(["public", "college", "connections", "private"])).optional(),
  profile_is_public: z.boolean().optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => profilePatchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const patch = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const usernameSchema = z.object({
  username: z.string().trim().regex(/^[A-Za-z0-9._-]{3,32}$/, "3–32 chars, letters, digits, . _ -"),
});

export const checkUsernameAvailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => usernameSchema.parse(input))
  .handler(async ({ data, context }) => {
    const uname = data.username.toLowerCase();
    const [{ data: existing }, { data: history }] = await Promise.all([
      context.supabase.from("profiles").select("id, username").ilike("username", uname).maybeSingle(),
      context.supabase.from("username_history").select("user_id").ilike("old_username", uname).maybeSingle(),
    ]);
    const takenByOther = existing && existing.id !== context.userId;
    const historyBlocked = history && history.user_id !== context.userId;
    return { available: !takenByOther && !historyBlocked };
  });

export const setMyUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => usernameSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ username: data.username })
      .eq("id", context.userId);
    if (error) throw new Error(error.message.includes("duplicate") ? "That username is taken." : error.message);
    return { ok: true, username: data.username };
  });

// Signed upload URL for user-content bucket. Client uploads directly to storage,
// then stores the returned public path back onto the profile row.
const uploadUrlSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  kind: z.enum(["avatar", "cover", "resume", "attachment"]),
});
export const createProfileUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => uploadUrlSchema.parse(input))
  .handler(async ({ data, context }) => {
    const safe = data.filename.replace(/[^A-Za-z0-9._-]/g, "_");
    const path = `${context.userId}/${data.kind}/${Date.now()}-${safe}`;
    const { data: signed, error } = await context.supabase.storage
      .from("user-content")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const getSignedReadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ path: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("user-content")
      .createSignedUrl(data.path, 3600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
