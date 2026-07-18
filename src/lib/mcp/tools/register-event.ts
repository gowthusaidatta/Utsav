import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, ok, notFound, invalidInput, conflict, mapDbError, recordAudit } from "../lib/supabase";

export default defineTool({
  name: "register_event",
  title: "Register for event",
  description: "Register the signed-in user for an event. Automatically waitlists when capacity is reached.",
  inputSchema: { event_id: z.string().uuid(), team_id: z.string().uuid().optional(), notes: z.string().trim().max(500).optional() },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const s = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data: ev, error } = await s.from("events").select("id, capacity, is_paid, registration_deadline, status").eq("id", input.event_id).maybeSingle();
    if (error) return mapDbError(error);
    if (!ev) return notFound("Event");
    if (ev.status !== "published") return invalidInput("Event is not open for registration.");
    if (ev.registration_deadline && new Date(ev.registration_deadline) < new Date()) return invalidInput("Registration deadline has passed.");

    let status = "registered";
    if (ev.capacity) {
      const { count } = await s.from("registrations").select("*", { count: "exact", head: true }).eq("event_id", input.event_id).eq("status", "registered");
      if ((count ?? 0) >= ev.capacity) status = "waitlist";
    }
    const { data, error: e2 } = await s.from("registrations").insert({
      event_id: input.event_id, user_id: uid, team_id: input.team_id ?? null, notes: input.notes ?? null,
      status, payment_status: ev.is_paid ? "pending" : "not_required",
    }).select().maybeSingle();
    if (e2) {
      if (e2.code === "23505") return conflict("Already registered for this event.");
      return mapDbError(e2);
    }
    await recordAudit(s, uid, "registration.create", "registration", data?.id, { event_id: input.event_id, status });
    return ok({ registration: data });
  },
});
