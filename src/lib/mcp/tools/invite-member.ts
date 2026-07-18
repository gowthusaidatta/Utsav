import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "invite_member",
  title: "Add organization member",
  description: "Add an existing Utsav user to an organization. Requires being an org coordinator or admin (enforced by RLS).",
  inputSchema: { org_id: z.string().uuid(), user_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { error } = await s.from("org_members").insert({ org_id: input.org_id, user_id: input.user_id });
    if (error) return mapDbError(error);
    await recordAudit(s, ctx.getUserId(), "org.member.add", "organization", input.org_id, { user_id: input.user_id });
    return ok({ added: true });
  },
});
