import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError } from "../lib/supabase";

export default defineTool({
  name: "attendance_statistics",
  title: "Attendance statistics",
  description: "Check-in totals across events. Optionally scoped to a single event.",
  inputSchema: { event_id: z.string().uuid().optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    let q = s.from("registrations").select("status, checked_in_at, event_id");
    if (input.event_id) q = q.eq("event_id", input.event_id);
    const { data, error } = await q.limit(10000);
    if (error) return mapDbError(error);
    let checkedIn = 0, noShow = 0, active = 0;
    for (const r of data ?? []) {
      if (r.status === "checked_in") checkedIn++;
      else if (r.status === "no_show") noShow++;
      if (r.status === "registered" || r.status === "checked_in") active++;
    }
    return ok({ active_registrations: active, checked_in: checkedIn, no_show: noShow, checkin_rate: active ? checkedIn / active : 0 });
  },
});
