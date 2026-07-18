import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const registerForEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ event_id: uuid, team_id: uuid.optional(), notes: z.string().max(1000).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ev, error: eErr } = await supabase
      .from("events")
      .select("id, status, capacity, is_paid, registration_deadline")
      .eq("id", data.event_id)
      .single();
    if (eErr || !ev) throw new Error("Event not found");
    if (ev.status !== "published") throw new Error("Event is not open for registration");
    if (ev.registration_deadline && new Date(ev.registration_deadline).getTime() < Date.now())
      throw new Error("Registration deadline has passed");

    let status: "registered" | "waitlist" = "registered";
    if (ev.capacity) {
      const { count } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", data.event_id)
        .in("status", ["registered", "checked_in"]);
      if ((count ?? 0) >= ev.capacity) status = "waitlist";
    }

    const payment_status = ev.is_paid ? "pending" : "not_required";
    const { data: row, error } = await supabase
      .from("registrations")
      .insert({
        event_id: data.event_id,
        user_id: userId,
        team_id: data.team_id ?? null,
        status,
        payment_status,
        notes: data.notes ?? null,
      })
      .select("id, status, payment_status")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("audit_logs").insert({
      actor_user_id: userId,
      action: "registration.created",
      resource_type: "registrations",
      resource_id: row.id,
      metadata: { event_id: data.event_id, status },
    });
    return row;
  });

export const cancelRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ registration_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("registrations")
      .update({ status: "cancelled" })
      .eq("id", data.registration_id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "registration.cancelled",
      resource_type: "registrations",
      resource_id: data.registration_id,
    });
    return { ok: true };
  });

export const myRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("registrations")
      .select("id, status, payment_status, team_id, created_at, event:events(id, slug, title, start_at, cover_image_url)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listEventRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ event_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("registrations")
      .select("id, status, payment_status, team_id, checked_in_at, created_at, user_id, user:profiles!registrations_user_id_fkey(id, full_name, email, avatar_url)")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateRegistrationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        registration_id: uuid,
        status: z.enum(["registered", "waitlist", "cancelled", "checked_in", "no_show"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "checked_in") patch.checked_in_at = new Date().toISOString();
    const { error } = await context.supabase
      .from("registrations")
      .update(patch)
      .eq("id", data.registration_id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "registration.status_changed",
      resource_type: "registrations",
      resource_id: data.registration_id,
      metadata: { status: data.status },
    });
    return { ok: true };
  });
