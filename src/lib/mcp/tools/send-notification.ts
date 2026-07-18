import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, invalidInput, forbidden, hasGlobalRole, recordAudit, ok } from "../lib/supabase";
import { enqueueNotification } from "../lib/notifications";

export default defineTool({
  name: "send_notification",
  title: "Send notification",
  description: "Send an immediate in-app or email notification to one or more users. Optional template with {{variables}}. Requires elevated role unless sending to self.",
  inputSchema: {
    recipient_user_ids: z.array(z.string().uuid()).min(1).max(500),
    channel: z.enum(["in_app", "email"]).default("in_app"),
    subject: z.string().max(200).optional(),
    body: z.string().max(4000).optional(),
    template_key: z.string().max(80).optional(),
    event_id: z.string().uuid().optional(),
    data: z.record(z.string(), z.any()).optional(),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const actor = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);

    if (!input.body && !input.template_key) return invalidInput("Provide either `body` or `template_key`.");

    // Broadcasts require elevated role; self-notifications are always allowed.
    const isSelfOnly = input.recipient_user_ids.length === 1 && input.recipient_user_ids[0] === actor;
    if (!isSelfOnly) {
      const isAdmin = await hasGlobalRole(supabase, actor, "admin");
      const isFaculty = await hasGlobalRole(supabase, actor, "faculty");
      let allowed = isAdmin || isFaculty;
      if (!allowed && input.event_id) {
        const { data: org } = await supabase.rpc("has_role_in_event", { _uid: actor, _role: "organizer", _event: input.event_id });
        const { data: co } = await supabase.rpc("has_role_in_event", { _uid: actor, _role: "coordinator", _event: input.event_id });
        allowed = Boolean(org || co);
      }
      if (!allowed) return forbidden("You cannot send broadcast notifications. Provide `event_id` for scoped organizer access.");
    }

    const results: { id: string; recipient: string; status: string }[] = [];
    const errors: { recipient: string; error: string }[] = [];
    for (const rid of input.recipient_user_ids) {
      const res = await enqueueNotification(supabase, {
        recipientUserId: rid,
        channel: input.channel,
        subject: input.subject ?? null,
        body: input.body ?? "",
        eventId: input.event_id ?? null,
        templateKey: input.template_key ?? null,
        data: input.data ?? {},
        senderUserId: actor,
      });
      if ("error" in res) errors.push({ recipient: rid, error: res.error });
      else results.push({ id: res.id, recipient: rid, status: res.status });
    }

    await recordAudit(supabase, actor, "notification.send", input.event_id ? "event" : "user", input.event_id ?? undefined, {
      channel: input.channel, sent: results.length, failed: errors.length, template_key: input.template_key,
    });
    return ok({ sent_count: results.length, failed_count: errors.length, results, errors });
  },
});
