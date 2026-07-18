import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../lib/supabase";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description:
    "Return the signed-in Utsav user's id, email, full name, and global roles.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const [profileRes, rolesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, college")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role, scope, scope_id")
        .eq("user_id", userId),
    ]);

    if (profileRes.error)
      return {
        content: [{ type: "text", text: profileRes.error.message }],
        isError: true,
      };

    const payload = {
      user_id: userId,
      email: profileRes.data?.email ?? ctx.getUserEmail() ?? null,
      full_name: profileRes.data?.full_name ?? null,
      college: profileRes.data?.college ?? null,
      roles: rolesRes.data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
