import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "update_organization",
  title: "Update organization",
  description: "Update organization name/type/parent. Requires faculty or admin role.",
  inputSchema: {
    org_id: z.string().uuid(),
    name: z.string().trim().min(2).max(120).optional(),
    type: z.enum(["college", "department", "club", "committee"]).optional(),
    parent_org_id: z.string().uuid().nullable().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { org_id, ...rest } = input;
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0) return ok({ updated: false });
    const { data, error } = await s.from("organizations").update(patch).eq("id", org_id).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, ctx.getUserId(), "org.update", "organization", org_id, patch);
    return ok({ organization: data });
  },
});
