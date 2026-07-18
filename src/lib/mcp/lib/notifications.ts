import type { SupabaseClient } from "@supabase/supabase-js";
import { fillTemplate } from "./certificates";

export type NotifyInput = {
  recipientUserId: string;
  channel: "in_app" | "email";
  subject?: string | null;
  body: string;
  eventId?: string | null;
  templateKey?: string | null;
  data?: Record<string, unknown>;
  scheduledAt?: string | null;
  senderUserId: string;
};

export async function loadTemplate(
  supabase: SupabaseClient,
  key: string,
): Promise<{ subject: string | null; body: string; channel: string } | null> {
  const { data, error } = await supabase
    .from("notification_templates")
    .select("subject_template, body_template, channel")
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  return { subject: data.subject_template, body: data.body_template, channel: data.channel };
}

export async function enqueueNotification(
  supabase: SupabaseClient,
  input: NotifyInput,
): Promise<{ id: string; status: string } | { error: string }> {
  let subject = input.subject ?? null;
  let body = input.body;
  if (input.templateKey) {
    const tpl = await loadTemplate(supabase, input.templateKey);
    if (tpl) {
      subject = subject ?? (tpl.subject ? fillTemplate(tpl.subject, input.data ?? {}) : null);
      body = fillTemplate(tpl.body, input.data ?? {}) || body;
    }
  }

  const scheduled = input.scheduledAt && new Date(input.scheduledAt) > new Date();
  const row = {
    recipient_user_id: input.recipientUserId,
    sender_user_id: input.senderUserId,
    event_id: input.eventId ?? null,
    channel: input.channel,
    template_key: input.templateKey ?? null,
    subject,
    body,
    data: input.data ?? {},
    scheduled_at: scheduled ? input.scheduledAt : null,
    status: scheduled ? "scheduled" : input.channel === "in_app" ? "sent" : "queued",
    sent_at: !scheduled && input.channel === "in_app" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase.from("notifications").insert(row).select("id, status").single();
  if (error) return { error: error.message };
  return { id: data.id, status: data.status };
}
