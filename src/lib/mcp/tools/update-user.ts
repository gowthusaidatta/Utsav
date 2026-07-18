import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "update_user",
  title: "Update user profile",
  description: "Update the signed-in user's own profile. Cannot change email or roles here.",
  inputSchema: {
    full_name: z.string().trim().min(1).max(120).optional(),
    college: z.string().trim().max(160).optional(),
    avatar_url: z.string().url().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const patch = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0) return ok({ updated: false });
    const { data, error } = await s.from("profiles").update(patch).eq("id", uid).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, uid, "profile.update", "profile", uid, patch);
    return ok({ updated: true, profile: data });
  },
});
