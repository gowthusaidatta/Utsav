import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, forbidden, invalidInput, notFound, mapDbError, recordAudit, can } from "../lib/supabase";
import { verifyQr } from "./validate-qr";

export default defineTool({
  name: "scan_qr",
  title: "Scan QR (check-in)",
  description: "Validate a QR token and mark the registration as checked-in. Requires check-in permission on the event.",
  inputSchema: { token: z.string().min(10).max(2000) },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const decoded = verifyQr(input.token);
    if (!decoded) return invalidInput("Invalid QR token.");
    if (decoded.exp < Date.now()) return invalidInput("QR token has expired.");
    if (!(await can(s, uid, "check_in", decoded.e))) return forbidden("Check-in permission required.");
    const { data, error } = await s.from("registrations")
      .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
      .eq("id", decoded.r).select().maybeSingle();
    if (error) return mapDbError(error);
    if (!data) return notFound("Registration");
    await recordAudit(s, uid, "attendance.checkin.qr", "registration", decoded.r, { event_id: decoded.e });
    return ok({ checked_in: true, registration: data });
  },
});
