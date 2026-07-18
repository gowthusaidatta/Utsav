import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, forbidden, notFound, mapDbError, hasGlobalRole } from "../lib/supabase";

export default defineTool({
  name: "get_user",
  title: "Get user",
  description: "Fetch a user's profile and roles. Callers may fetch themselves; admins may fetch anyone.",
  inputSchema: { user_id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const self = ctx.getUserId();
    if (input.user_id !== self && !(await hasGlobalRole(s, self, "admin"))) return forbidden();
    const [{ data: profile, error }, { data: roles }] = await Promise.all([
      s.from("profiles").select("id, email, full_name, college, created_at").eq("id", input.user_id).maybeSingle(),
      s.from("user_roles").select("role, scope, scope_id, expires_at").eq("user_id", input.user_id),
    ]);
    if (error) return mapDbError(error);
    if (!profile) return notFound("User");
    return ok({ profile, roles: roles ?? [] });
  },
});
