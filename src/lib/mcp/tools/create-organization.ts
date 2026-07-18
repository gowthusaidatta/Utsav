import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

export default defineTool({
  name: "create_organization",
  title: "Create organization",
  description: "Create a new Utsav organization. Requires faculty or admin role (enforced by RLS).",
  inputSchema: {
    name: z.string().trim().min(2).max(120),
    type: z.enum(["college", "department", "club", "committee"]),
    parent_org_id: z.string().uuid().optional(),
    slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const actor = ctx.getUserId();
    const slug = input.slug ?? `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await s.from("organizations").insert({
      name: input.name, slug, type: input.type,
      parent_org_id: input.parent_org_id ?? null, created_by: actor,
    }).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, actor, "org.create", "organization", data?.id, { name: input.name, type: input.type });
    return ok({ organization: data });
  },
});
