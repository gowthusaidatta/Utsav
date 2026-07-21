import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, forbidden, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "approve_registration",
  title: "Approve registration",
  description: "Move a registration to 'registered' status (used to promote from waitlist). Requires manage-teams permission on the event.",
  inputSchema: { registration_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const actor = ctx.getUserId()!;
    const s = supabaseForUser(ctx);
    const { data: reg, error: regErr } = await s
      .from("registrations")
      .select("id, event_id, user_id")
      .eq("id", input.registration_id)
      .maybeSingle();
    if (regErr) return mapDbError(regErr);
    if (!reg) return forbidden("Registration not found");
    const { data: canManage } = await s.rpc("can", { _uid: actor, _action: "manage_teams", _event: reg.event_id });
    if (!canManage) return forbidden("You need manage-teams permission on this event to approve registrations.");

    const { data, error } = await s.from("registrations").update({ status: "registered" }).eq("id", input.registration_id).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, actor, "registration.approve", "registration", input.registration_id);
    return ok({ registration: data });
  },
});

