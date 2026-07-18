import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, notFound, forbidden, invalidInput, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "transfer_leader",
  title: "Transfer team leader",
  description: "Transfer team leadership to another active member. Only the current leader can do this.",
  inputSchema: { team_id: z.string().uuid(), new_leader_user_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data: team, error } = await s.from("teams").select("id, leader_user_id").eq("id", input.team_id).maybeSingle();
    if (error) return mapDbError(error);
    if (!team) return notFound("Team");
    if (team.leader_user_id !== uid) return forbidden("Only the current leader can transfer.");
    const { data: member } = await s.from("team_members").select("user_id, status").eq("team_id", input.team_id).eq("user_id", input.new_leader_user_id).maybeSingle();
    if (!member || member.status !== "active") return invalidInput("New leader must be an active member of the team.");
    const { data, error: e2 } = await s.from("teams").update({ leader_user_id: input.new_leader_user_id }).eq("id", input.team_id).select().maybeSingle();
    if (e2) return mapDbError(e2);
    await s.from("team_members").update({ role: "leader" }).eq("team_id", input.team_id).eq("user_id", input.new_leader_user_id);
    await s.from("team_members").update({ role: "member" }).eq("team_id", input.team_id).eq("user_id", uid);
    await recordAudit(s, uid, "team.leader.transfer", "team", input.team_id, { new_leader: input.new_leader_user_id });
    return ok({ team: data });
  },
});
