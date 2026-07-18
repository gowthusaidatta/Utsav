import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "reject_registration",
  title: "Reject registration",
  description: "Cancel a registration (staff action). Requires manage-teams permission.",
  inputSchema: { registration_id: z.string().uuid(), reason: z.string().trim().max(500).optional() },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const { data, error } = await s.from("registrations").update({ status: "cancelled" }).eq("id", input.registration_id).select().maybeSingle();
    if (error) return mapDbError(error);
    await recordAudit(s, ctx.getUserId(), "registration.reject", "registration", input.registration_id, { reason: input.reason ?? null });
    return ok({ registration: data });
  },
});
