import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, notFound, conflict, invalidInput, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "join_team",
  title: "Join team",
  description: "Join a team using its invite code. The caller becomes an active member.",
  inputSchema: { invite_code: z.string().trim().min(4).max(64) },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data: team, error } = await s.from("teams").select("id, event_id, max_size, status").eq("invite_code", input.invite_code).maybeSingle();
    if (error) return mapDbError(error);
    if (!team) return notFound("Team");
    if (team.status !== "active") return invalidInput("Team is not accepting members.");
    const { count } = await s.from("team_members").select("*", { count: "exact", head: true }).eq("team_id", team.id).eq("status", "active");
    if ((count ?? 0) >= team.max_size) return conflict("Team is full.");
    const { data, error: e2 } = await s.from("team_members").insert({ team_id: team.id, user_id: uid, role: "member", status: "active" }).select().maybeSingle();
    if (e2) {
      if (e2.code === "23505") return conflict("Already a member of this team.");
      return mapDbError(e2);
    }
    await recordAudit(s, uid, "team.join", "team", team.id, { event_id: team.event_id });
    return ok({ team_id: team.id, member: data });
  },
});
