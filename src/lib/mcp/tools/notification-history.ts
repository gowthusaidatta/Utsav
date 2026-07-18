import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, mapDbError, ok } from "../lib/supabase";

export default defineTool({
  name: "notification_history",
  title: "Notification history",
  description: "List notifications visible under RLS (recipient's own, sender's own, admin/faculty/event-manager view). Filter by status, channel, or event.",
  inputSchema: {
    recipient_user_id: z.string().uuid().optional(),
    event_id: z.string().uuid().optional(),
    channel: z.enum(["in_app", "email"]).optional(),
    status: z.enum(["queued","scheduled","sent","failed","read","cancelled"]).optional(),
    limit: z.number().int().min(1).max(200).default(50),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let q = supabase.from("notifications")
      .select("id, recipient_user_id, sender_user_id, event_id, channel, template_key, subject, body, status, scheduled_at, sent_at, read_at, retry_count, last_error, created_at")
      .order("created_at", { ascending: false })
      .limit(input.limit);
    if (input.recipient_user_id) q = q.eq("recipient_user_id", input.recipient_user_id);
    if (input.event_id) q = q.eq("event_id", input.event_id);
    if (input.channel) q = q.eq("channel", input.channel);
    if (input.status) q = q.eq("status", input.status);
    const { data, error } = await q;
    if (error) return mapDbError(error);
    return ok({ items: data ?? [], count: data?.length ?? 0 });
  },
});
