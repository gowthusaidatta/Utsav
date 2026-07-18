import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "remove_member",
  title: "Remove organization member",
  description: "Remove a user from an organization. Users can remove themselves; coordinators/admins can remove anyone.",
  inputSchema: { org_id: z.string().uuid(), user_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { error } = await s.from("org_members").delete().eq("org_id", input.org_id).eq("user_id", input.user_id);
    if (error) return mapDbError(error);
    await recordAudit(s, ctx.getUserId(), "org.member.remove", "organization", input.org_id, { user_id: input.user_id });
    return ok({ removed: true });
  },
});
