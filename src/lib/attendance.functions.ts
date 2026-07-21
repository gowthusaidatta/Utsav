import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

async function assertScanPermission(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  eventId: string,
) {
  const { data: allowed } = await supabase.rpc("can", {
    _uid: userId,
    _action: "check_in",
    _event: eventId,
  });
  if (!allowed) throw new Error("Forbidden: you don't have scan permission for this event");
}

// -------------------------------------------------------------------
// verifyQr — validates token; DOES NOT mark attendance
// -------------------------------------------------------------------
export const verifyQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ token: z.string().trim().min(4).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("verify_registration_qr", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    return result as {
      valid: boolean;
      reason?: string;
      registration_id?: string;
      event_id?: string;
      event_title?: string;
      user_id?: string;
      team_id?: string | null;
      status?: string;
      checked_in_at?: string | null;
      already_checked_in?: boolean;
      profile?: {
        id: string;
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
        college: string | null;
        department: string | null;
      } | null;
    };
  });

// -------------------------------------------------------------------
// scanCheckIn — atomic: verify + mark checked_in + log
// -------------------------------------------------------------------
type ScanProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  college: string | null;
  department: string | null;
} | null;

export type ScanResultData = {
  ok: boolean;
  reason?: string | null;
  checked_in_at?: string | null;
  profile: ScanProfile;
  event_title?: string | null;
  registration_id?: string | null;
};

export const scanCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        token: z.string().trim().min(4).max(200),
        method: z.enum(["qr_camera", "qr_scanner", "manual"]).default("qr_camera"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ScanResultData> => {
    const { supabase, userId } = context;

    const { data: verified, error: vErr } = await supabase.rpc("verify_registration_qr", {
      _token: data.token,
    });
    if (vErr) throw new Error(vErr.message);
    const v = verified as {
      valid: boolean;
      reason?: string;
      registration_id?: string;
      event_id?: string;
      already_checked_in?: boolean;
      checked_in_at?: string | null;
      user_id?: string;
      profile?: ScanProfile;
      event_title?: string;
    };
    if (!v.valid) return { ok: false, reason: v.reason ?? null, profile: null };
    await assertScanPermission(supabase, userId, v.event_id!);

    if (v.already_checked_in) {
      return {
        ok: false,
        reason: "already_checked_in",
        checked_in_at: v.checked_in_at ?? null,
        profile: v.profile ?? null,
        event_title: v.event_title ?? null,
        registration_id: v.registration_id ?? null,
      };
    }

    const now = new Date().toISOString();
    const { error: uErr } = await supabase
      .from("registrations")
      .update({ status: "checked_in", checked_in_at: now, checked_in_by: userId })
      .eq("id", v.registration_id!);
    if (uErr) throw new Error(uErr.message);

    await supabase.from("attendance_logs").insert({
      registration_id: v.registration_id!,
      event_id: v.event_id!,
      user_id: v.user_id!,
      action: "check_in",
      operator_id: userId,
      method: data.method,
    });

    return {
      ok: true,
      checked_in_at: now,
      profile: v.profile ?? null,
      event_title: v.event_title ?? null,
      registration_id: v.registration_id ?? null,
    };
  });


// -------------------------------------------------------------------
// manualCheckIn — by registration_id (for search-then-mark flow)
// -------------------------------------------------------------------
export const manualCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ registration_id: uuid, notes: z.string().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: reg, error: rErr } = await supabase
      .from("registrations")
      .select("id, event_id, user_id, checked_in_at, status")
      .eq("id", data.registration_id)
      .single();
    if (rErr || !reg) throw new Error("Registration not found");
    await assertScanPermission(supabase, userId, reg.event_id);
    if (reg.checked_in_at) throw new Error("Already checked in");
    if (reg.status === "cancelled") throw new Error("Registration is cancelled");
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("registrations")
      .update({ status: "checked_in", checked_in_at: now, checked_in_by: userId })
      .eq("id", data.registration_id);
    if (error) throw new Error(error.message);
    await supabase.from("attendance_logs").insert({
      registration_id: data.registration_id,
      event_id: reg.event_id,
      user_id: reg.user_id,
      action: "manual_check_in",
      operator_id: userId,
      method: "manual",
      notes: data.notes ?? null,
    });
    return { ok: true, checked_in_at: now };
  });

// -------------------------------------------------------------------
// undoCheckIn — reverse a check-in (audited)
// -------------------------------------------------------------------
export const undoCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ registration_id: uuid, reason: z.string().max(500).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: reg, error } = await supabase
      .from("registrations")
      .select("id, event_id, user_id")
      .eq("id", data.registration_id)
      .single();
    if (error || !reg) throw new Error("Registration not found");

    const { data: allowed } = await supabase.rpc("can", {
      _uid: userId,
      _action: "undo_attendance",
      _event: reg.event_id,
    });
    if (!allowed) throw new Error("Forbidden: you cannot undo attendance for this event");

    const { error: uErr } = await supabase
      .from("registrations")
      .update({ status: "registered", checked_in_at: null, checked_in_by: null })
      .eq("id", data.registration_id);
    if (uErr) throw new Error(uErr.message);
    await supabase.from("attendance_logs").insert({
      registration_id: reg.id,
      event_id: reg.event_id,
      user_id: reg.user_id,
      action: "undo",
      operator_id: userId,
      method: "manual",
      notes: data.reason ?? null,
    });
    return { ok: true };
  });

// -------------------------------------------------------------------
// eventAttendanceStats — live counts for dashboard
// -------------------------------------------------------------------
export const eventAttendanceStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ event_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: stats, error } = await context.supabase.rpc("event_attendance_stats", {
      _event: data.event_id,
    });
    if (error) throw new Error(error.message);
    return stats as {
      registered: number;
      checked_in: number;
      pending: number;
      cancelled: number;
      walk_ins: number;
      no_show: number;
    };
  });

// -------------------------------------------------------------------
// listAttendanceLog — for auditing
// -------------------------------------------------------------------
export const listAttendanceLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ event_id: uuid, limit: z.number().int().min(1).max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("attendance_logs")
      .select("id, action, method, notes, created_at, user_id, operator_id, registration_id")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// -------------------------------------------------------------------
// searchEventRegistrations — search for manual check-in
// -------------------------------------------------------------------
export const searchEventRegistrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ event_id: uuid, q: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertScanPermission(context.supabase, context.userId, data.event_id);
    const term = data.q.replace(/[%_]/g, (m) => `\\${m}`);
    const { data: profs, error: pe } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, username, avatar_url")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,username.ilike.%${term}%`)
      .limit(20);
    if (pe) throw new Error(pe.message);
    const userIds = (profs ?? []).map((p) => p.id);
    if (userIds.length === 0) return [];
    const { data: regs, error } = await context.supabase
      .from("registrations")
      .select("id, user_id, status, team_id, checked_in_at")
      .eq("event_id", data.event_id)
      .in("user_id", userIds);
    if (error) throw new Error(error.message);
    const byUser = new Map((regs ?? []).map((r) => [r.user_id, r]));
    return (profs ?? [])
      .map((p) => ({ profile: p, registration: byUser.get(p.id) ?? null }))
      .filter((x) => x.registration !== null);
  });

// -------------------------------------------------------------------
// myAttendanceHistory — user's own history
// -------------------------------------------------------------------
export const myAttendanceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("registrations")
      .select("id, status, checked_in_at, checked_out_at, event:events(id, slug, title, start_at, certificate_rule)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// -------------------------------------------------------------------
// revokeMyQr / regenerateMyQr — regenerate token if compromised
// -------------------------------------------------------------------
export const regenerateMyQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ registration_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    // Regenerate token: random 24 bytes base64
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = btoa(String.fromCharCode(...bytes));
    const { data: row, error } = await context.supabase
      .from("registrations")
      .update({ qr_token: token, qr_revoked_at: null })
      .eq("id", data.registration_id)
      .eq("user_id", context.userId)
      .select("id, qr_token")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Registration not found");
    return { qr_token: row.qr_token };
  });

// -------------------------------------------------------------------
// revokeRegistrationQr — organizer revokes a compromised QR
// -------------------------------------------------------------------
export const revokeRegistrationQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ registration_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: reg, error: rErr } = await context.supabase
      .from("registrations")
      .select("id, event_id")
      .eq("id", data.registration_id)
      .single();
    if (rErr || !reg) throw new Error("Registration not found");
    const { data: allowed } = await context.supabase.rpc("can", {
      _uid: context.userId,
      _action: "manage_teams",
      _event: reg.event_id,
    });
    if (!allowed) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("registrations")
      .update({ qr_revoked_at: new Date().toISOString() })
      .eq("id", data.registration_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
