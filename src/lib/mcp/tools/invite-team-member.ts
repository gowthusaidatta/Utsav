import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "invite_team_member",
  title: "Invite team member",
  description: "Add an existing Utsav user directly to a team as an active member. Leader or event staff only.",
  inputSchema: { team_id: z.string().uuid(), user_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { data, error } = await s.from("team_members")
      .insert({ team_id: input.team_id, user_id: input.user_id, role: "member", status: "active" })
      .select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, ctx.getUserId(), "team.member.invite", "team", input.team_id, { user_id: input.user_id });
    return ok({ member: data });
  },
});
