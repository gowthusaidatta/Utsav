import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "approve_registration",
  title: "Approve registration",
  description: "Move a registration to 'registered' status (used to promote from waitlist). Requires manage-teams permission.",
  inputSchema: { registration_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { data, error } = await s.from("registrations").update({ status: "registered" }).eq("id", input.registration_id).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, ctx.getUserId(), "registration.approve", "registration", input.registration_id);
    return ok({ registration: data });
  },
});
