import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "attendance_report",
  title: "Attendance report",
  description: "Summary of registrations and check-ins for an event. Requires check-in or manage-teams permission.",
  inputSchema: { event_id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { data, error } = await s.from("registrations").select("status").eq("event_id", input.event_id);
    if (error) return mapDbError(error);
    const counts: Record<string, number> = { registered: 0, waitlist: 0, cancelled: 0, checked_in: 0, no_show: 0 };
    for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
    const totalActive = counts.registered + counts.checked_in;
    const rate = totalActive > 0 ? counts.checked_in / totalActive : 0;
    return ok({ event_id: input.event_id, counts, total: (data ?? []).length, checkin_rate: rate });
  },
});
