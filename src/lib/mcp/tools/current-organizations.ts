import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "current_organizations",
  title: "My organizations",
  description: "List organizations the signed-in user is a member of.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { data: memberships, error } = await s
      .from("org_members")
      .select("org_id, joined_at")
      .eq("user_id", ctx.getUserId());
    if (error) return mapDbError(error);
    const ids = (memberships ?? []).map((m) => m.org_id);
    if (ids.length === 0) return ok({ organizations: [] });
    const { data: orgs, error: e2 } = await s
      .from("organizations")
      .select("id, name, slug, type, parent_org_id")
      .in("id", ids);
    if (e2) return mapDbError(e2);
    return ok({ organizations: orgs ?? [] });
  },
});
