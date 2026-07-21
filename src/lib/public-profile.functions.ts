import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

function isNewKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

function serverPublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (isNewKey(key) && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export type PublicProfileResult =
  | { not_found: true; redirect_to: string | null }
  | { not_found: false; private: true; username: string }
  | { not_found: false; private: false; profile: Json };

export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ username: z.string().trim().min(1).max(64) }).parse(input))
  .handler(async ({ data }): Promise<PublicProfileResult> => {
    const supabase = serverPublicClient();
    const { data: rpc, error } = await supabase.rpc("get_public_profile", { _username: data.username });
    if (error) throw new Error(error.message);
    return rpc as unknown as PublicProfileResult;
  });

export type PublicEducation = {
  id: string;
  institution: string;
  degree: string | null;
  course: string | null;
  branch: string | null;
  specialization: string | null;
  start_date: string | null;
  end_date: string | null;
  currently_studying: boolean;
  cgpa: number | null;
  percentage: number | null;
  achievements: string | null;
  description: string | null;
};

export type PublicPursuit = {
  id: string;
  type: string;
  title: string;
  issuing_organization: string | null;
  issue_date: string | null;
  credential_url: string | null;
  description: string | null;
  skills: string[];
  badge_url: string | null;
};

export type PublicCertificate = {
  id: string;
  code: string;
  title: string | null;
  template_key: string;
  issued_at: string;
  revoked_at: string | null;
  event_id: string;
  event_title: string | null;
  event_slug: string | null;
};

export const getPublicProfileExtras = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(
    async ({ data }): Promise<{
      education: PublicEducation[];
      pursuits: PublicPursuit[];
      certificates: PublicCertificate[];
    }> => {
      const supabase = serverPublicClient();
      const [eduRes, purRes, certRes] = await Promise.all([
        supabase
          .from("user_education")
          .select(
            "id, institution, degree, course, branch, specialization, start_date, end_date, currently_studying, cgpa, percentage, achievements, description, sort_order",
          )
          .eq("user_id", data.user_id)
          .order("sort_order", { ascending: true })
          .order("start_date", { ascending: false, nullsFirst: false }),
        supabase
          .from("user_pursuits")
          .select(
            "id, type, title, issuing_organization, issue_date, credential_url, description, skills, badge_url, sort_order",
          )
          .eq("user_id", data.user_id)
          .order("sort_order", { ascending: true })
          .order("issue_date", { ascending: false, nullsFirst: false }),
        supabase
          .from("certificates")
          .select("id, code, title, template_key, issued_at, revoked_at, event_id")
          .eq("user_id", data.user_id)
          .is("revoked_at", null)
          .order("issued_at", { ascending: false }),
      ]);
      const eventIds = Array.from(new Set((certRes.data ?? []).map((c) => c.event_id)));
      const eventsMap = new Map<string, { title: string | null; slug: string | null }>();
      if (eventIds.length > 0) {
        const evRes = await supabase.from("events").select("id, title, slug").in("id", eventIds);
        for (const e of evRes.data ?? []) {
          eventsMap.set(e.id, { title: e.title, slug: e.slug });
        }
      }
      return {
        education: (eduRes.data ?? []) as unknown as PublicEducation[],
        pursuits: (purRes.data ?? []) as unknown as PublicPursuit[],
        certificates: (certRes.data ?? []).map((c) => ({
          id: c.id,
          code: c.code,
          title: c.title,
          template_key: c.template_key,
          issued_at: c.issued_at,
          revoked_at: c.revoked_at,
          event_id: c.event_id,
          event_title: eventsMap.get(c.event_id)?.title ?? null,
          event_slug: eventsMap.get(c.event_id)?.slug ?? null,
        })),
      };
    },
  );
