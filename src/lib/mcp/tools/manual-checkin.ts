import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, forbidden, notFound, mapDbError, recordAudit, can } from "../lib/supabase";

export default defineTool({
  name: "manual_checkin",
  title: "Manual check-in",
  description: "Manually check-in a registration without a QR. Requires check-in permission on the event.",
  inputSchema: { registration_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data: reg, error } = await s.from("registrations").select("id, event_id").eq("id", input.registration_id).maybeSingle();
    if (error) return mapDbError(error);
    if (!reg) return notFound("Registration");
    if (!(await can(s, uid, "check_in", reg.event_id))) return forbidden("Check-in permission required.");
    const { data, error: e2 } = await s.from("registrations")
      .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
      .eq("id", input.registration_id).select().maybeSingle();
    if (e2) return mapDbError(e2);
    await recordAudit(s, uid, "attendance.checkin.manual", "registration", input.registration_id, { event_id: reg.event_id });
    return ok({ registration: data });
  },
});
