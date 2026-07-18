import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "list_organizations",
  title: "List organizations",
  description: "List Utsav organizations. Visible to all authenticated users.",
  inputSchema: {
    query: z.string().trim().max(120).optional(),
    type: z.enum(["college", "department", "club", "committee"]).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    let q = s.from("organizations").select("id, name, slug, type, parent_org_id, created_at").order("name").limit(input.limit ?? 50);
    if (input.type) q = q.eq("type", input.type);
    if (input.query) {
      const t = input.query.replace(/[%_]/g, (m) => `\\${m}`);
      q = q.or(`name.ilike.%${t}%,slug.ilike.%${t}%`);
    }
    const { data, error } = await q;
    if (error) return mapDbError(error);
    return ok({ organizations: data ?? [] });
  },
});
