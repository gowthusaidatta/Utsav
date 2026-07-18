import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "event_statistics",
  title: "Event statistics",
  description: "Registration, team, and check-in counts for a single event.",
  inputSchema: { event_id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const [regRes, teamRes] = await Promise.all([
      s.from("registrations").select("status").eq("event_id", input.event_id),
      s.from("teams").select("id, status", { count: "exact" }).eq("event_id", input.event_id),
    ]);
    if (regRes.error) return mapDbError(regRes.error);
    const c: Record<string, number> = {};
    for (const r of regRes.data ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return ok({
      event_id: input.event_id,
      registrations: { total: (regRes.data ?? []).length, by_status: c },
      teams: { total: teamRes.count ?? 0 },
    });
  },
});
