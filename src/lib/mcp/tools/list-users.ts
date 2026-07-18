import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, forbidden, mapDbError, hasGlobalRole } from "../lib/supabase";

export default defineTool({
  name: "list_users",
  title: "List users",
  description: "Search Utsav users by name/email. Admin-only.",
  inputSchema: {
    query: z.string().trim().max(120).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    if (!(await hasGlobalRole(s, ctx.getUserId(), "admin"))) return forbidden("Admin role required.");
    let q = s
      .from("profiles")
      .select("id, email, full_name, college, created_at")
      .order("created_at", { ascending: false })
      .limit(input.limit ?? 25);
    if (input.query) {
      const t = input.query.replace(/[%_]/g, (m) => `\\${m}`);
      q = q.or(`full_name.ilike.%${t}%,email.ilike.%${t}%`);
    }
    const { data, error } = await q;
    if (error) return mapDbError(error);
    return ok({ users: data ?? [] });
  },
});
