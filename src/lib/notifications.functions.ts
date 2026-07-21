import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

// List notifications for the current user
export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number; unreadOnly?: boolean } | undefined) =>
    z
      .object({
        limit: z.number().int().min(1).max(200).optional(),
        unreadOnly: z.boolean().optional(),
      })
      .optional()
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const limit = data?.limit ?? 50;
    let q = context.supabase
      .from("notifications")
      .select(
        "id, subject, body, template_key, status, read_at, event_id, sender_user_id, data, created_at",
      )
      .eq("recipient_user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data?.unreadOnly) q = q.is("read_at", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Unread count
export const unreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

// Mark one as read
export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; read: boolean }) =>
    z.object({ id: uuid, read: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: data.read ? new Date().toISOString() : null })
      .eq("id", data.id)
      .eq("recipient_user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Mark all as read
export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
