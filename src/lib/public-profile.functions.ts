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

// Extras are now returned inline by the get_public_profile RPC; the fields above
// document the shapes embedded in PublicProfileResult["profile"].

