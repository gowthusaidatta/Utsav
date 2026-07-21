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
      .select("id, status, capacity, is_paid, registration_deadline, registration_type, min_team_size, max_team_size")
      .eq("id", data.event_id)
      .single();
    if (eErr || !ev) throw new Error("Event not found");
    if (ev.status !== "published") throw new Error("Event is not open for registration");
    if (ev.registration_deadline && new Date(ev.registration_deadline).getTime() < Date.now())
      throw new Error("Registration deadline has passed");

    if (ev.registration_type === "team" && !data.team_id) {
      throw new Error("This is a team event — you must create or join a team");
    }
    if (ev.registration_type === "individual" && data.team_id) {
      throw new Error("This is an individual event — team is not allowed");
    }

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
      .select("id, status, payment_status, team_id, qr_token, qr_revoked_at, checked_in_at, created_at, event:events(id, slug, title, start_at, cover_image_url, registration_type)")
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
      .select("id, status, payment_status, team_id, checked_in_at, created_at, user_id")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const registrations = rows ?? [];
    const userIds = Array.from(new Set(registrations.map((r) => r.user_id)));
    let profilesById = new Map<
      string,
      { id: string; full_name: string | null; email: string | null; avatar_url: string | null }
    >();
    if (userIds.length > 0) {
      const { data: profs, error: pErr } = await context.supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);
      if (pErr) throw new Error(pErr.message);
      profilesById = new Map((profs ?? []).map((p) => [p.id, p]));
    }
    return registrations.map((r) => ({ ...r, user: profilesById.get(r.user_id) ?? null }));
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
    // Load the row so we can authorize by event_id / ownership.
    const { data: reg, error: regErr } = await context.supabase
      .from("registrations")
      .select("id, event_id, user_id, status")
      .eq("id", data.registration_id)
      .single();
    if (regErr || !reg) throw new Error("Registration not found");

    const isSelf = reg.user_id === context.userId;
    // Only staff with manage_teams or check_in on this event may perform privileged transitions.
    // Attendees may only self-cancel.
    if (data.status !== "cancelled") {
      const [{ data: canManage }, { data: canCheckIn }] = await Promise.all([
        context.supabase.rpc("can", { _uid: context.userId, _action: "manage_teams", _event: reg.event_id }),
        context.supabase.rpc("can", { _uid: context.userId, _action: "check_in", _event: reg.event_id }),
      ]);
      if (!canManage && !canCheckIn) {
        throw new Error("Forbidden: staff permission required to change registration status");
      }
    } else if (!isSelf) {
      // Non-self cancellations require staff.
      const { data: canManage } = await context.supabase.rpc("can", {
        _uid: context.userId,
        _action: "manage_teams",
        _event: reg.event_id,
      });
      if (!canManage) throw new Error("Forbidden: cannot cancel another user's registration");
    }

    const patch: { status: typeof data.status; checked_in_at?: string } = { status: data.status };
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

