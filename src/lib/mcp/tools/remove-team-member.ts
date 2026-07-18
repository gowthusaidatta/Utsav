import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "remove_team_member",
  title: "Remove team member",
  description: "Remove a member from a team. Leader or event staff only.",
  inputSchema: { team_id: z.string().uuid(), user_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { error } = await s.from("team_members").delete().eq("team_id", input.team_id).eq("user_id", input.user_id);
    if (error) return mapDbError(error);
    await recordAudit(s, ctx.getUserId(), "team.member.remove", "team", input.team_id, { user_id: input.user_id });
    return ok({ removed: true });
  },
});
