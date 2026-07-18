import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "create_team",
  title: "Create team",
  description: "Create a team for an event; the caller becomes the leader and first member.",
  inputSchema: {
    event_id: z.string().uuid(),
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(500).optional(),
    max_size: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data, error } = await s.from("teams").insert({
      event_id: input.event_id, name: input.name, description: input.description ?? null,
      max_size: input.max_size ?? 4, leader_user_id: uid,
    }).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, uid, "team.create", "team", data?.id, { event_id: input.event_id });
    return ok({ team: data });
  },
});
