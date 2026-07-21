import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

// -------------------------------------------------------------------
// inviteToTeam — leader invites by username or email
// -------------------------------------------------------------------
export const inviteToTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        team_id: uuid,
        username: z.string().trim().min(1).max(64).optional(),
        email: z.string().email().max(255).optional(),
        message: z.string().max(500).optional(),
      })
      .refine((v) => !!v.username || !!v.email, {
        message: "Provide a username or email",
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Try to resolve to an existing profile
    let invited_user_id: string | null = null;
    let invited_username: string | null = data.username ?? null;
    let invited_email: string | null = data.email ?? null;

    if (data.username) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, username, email")
        .ilike("username", data.username)
        .maybeSingle();
      if (p) {
        invited_user_id = p.id;
        invited_username = p.username;
        invited_email = p.email;
      }
    } else if (data.email) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, username, email")
        .ilike("email", data.email)
        .maybeSingle();
      if (p) invited_user_id = p.id;
    }

    const { data: row, error } = await supabase
      .from("team_invites")
      .insert({
        team_id: data.team_id,
        invited_by: userId,
        invited_user_id,
        invited_email,
        invited_username,
        message: data.message ?? null,
      })
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// -------------------------------------------------------------------
// listTeamInvites — for a given team (leader/staff view)
// -------------------------------------------------------------------
export const listTeamInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ team_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("team_invites")
      .select("id, status, invited_user_id, invited_email, invited_username, message, created_at, responded_at")
      .eq("team_id", data.team_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// -------------------------------------------------------------------
// myInvites — invitations addressed to me
// -------------------------------------------------------------------
export const myInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("team_invites")
      .select("id, status, message, created_at, team:teams(id, name, event_id, event:events(id, title, slug))")
      .eq("invited_user_id", context.userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// -------------------------------------------------------------------
// respondToInvite — accept/reject
// -------------------------------------------------------------------
export const respondToInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ invite_id: uuid, action: z.enum(["accept", "reject"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inv, error } = await supabase
      .from("team_invites")
      .select("id, team_id, invited_user_id, status, team:teams(event_id, max_size)")
      .eq("id", data.invite_id)
      .single();
    if (error || !inv) throw new Error("Invite not found");
    if (inv.invited_user_id !== userId) throw new Error("Forbidden");
    if (inv.status !== "pending") throw new Error("Invite already responded to");

    const newStatus = data.action === "accept" ? "accepted" : "rejected";
    const { error: uErr } = await supabase
      .from("team_invites")
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq("id", data.invite_id);
    if (uErr) throw new Error(uErr.message);

    if (data.action === "accept") {
      const team = inv.team as unknown as { event_id: string; max_size: number };
      // Capacity check
      const { count } = await supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("team_id", inv.team_id)
        .eq("status", "active");
      if ((count ?? 0) >= team.max_size) throw new Error("Team is full");

      const { error: mErr } = await supabase
        .from("team_members")
        .insert({ team_id: inv.team_id, user_id: userId, role: "member", status: "active" });
      if (mErr && !String(mErr.message).includes("duplicate")) throw new Error(mErr.message);
    }
    return { ok: true, status: newStatus };
  });

// -------------------------------------------------------------------
// revokeInvite — leader cancels an invite
// -------------------------------------------------------------------
export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ invite_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_invites")
      .update({ status: "revoked", responded_at: new Date().toISOString() })
      .eq("id", data.invite_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------------------------------------------------------------------
// transferLeadership — leader hands off role
// -------------------------------------------------------------------
export const transferLeadership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ team_id: uuid, new_leader_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Must be current leader
    const { data: team, error } = await supabase
      .from("teams")
      .select("id, leader_user_id")
      .eq("id", data.team_id)
      .single();
    if (error || !team) throw new Error("Team not found");
    if (team.leader_user_id !== userId) throw new Error("Only the current leader can transfer leadership");

    // New leader must be an active member
    const { data: member } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", data.team_id)
      .eq("user_id", data.new_leader_id)
      .eq("status", "active")
      .maybeSingle();
    if (!member) throw new Error("New leader must be an active team member");

    const { error: uErr } = await supabase
      .from("teams")
      .update({ leader_user_id: data.new_leader_id })
      .eq("id", data.team_id);
    if (uErr) throw new Error(uErr.message);
    // Update roles
    await supabase.from("team_members").update({ role: "member" }).eq("team_id", data.team_id).eq("user_id", userId);
    await supabase
      .from("team_members")
      .update({ role: "leader" })
      .eq("team_id", data.team_id)
      .eq("user_id", data.new_leader_id);
    return { ok: true };
  });
