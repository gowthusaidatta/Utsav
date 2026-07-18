import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const createTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        event_id: uuid,
        name: z.string().trim().min(2).max(80),
        description: z.string().max(500).optional(),
        max_size: z.number().int().min(1).max(50).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("teams")
      .insert({
        event_id: data.event_id,
        name: data.name,
        description: data.description ?? null,
        leader_user_id: userId,
        max_size: data.max_size ?? 4,
      })
      .select("id, invite_code")
      .single();
    if (error) throw new Error(error.message);
    await supabase.from("audit_logs").insert({
      actor_user_id: userId,
      action: "team.created",
      resource_type: "teams",
      resource_id: row.id,
      metadata: { event_id: data.event_id },
    });
    return row;
  });

export const listEventTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ event_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: teams, error } = await context.supabase
      .from("teams")
      .select("id, name, description, max_size, status, leader_user_id, created_at, members:team_members(count)")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return teams ?? [];
  });

export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ team_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: team, error } = await context.supabase
      .from("teams")
      .select("id, event_id, name, description, max_size, status, invite_code, leader_user_id, members:team_members(id, user_id, role, status, joined_at, profile:profiles!team_members_user_id_fkey(id, full_name, email, avatar_url))")
      .eq("id", data.team_id)
      .single();
    if (error) throw new Error(error.message);
    return team;
  });

export const joinTeamByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ invite_code: z.string().trim().min(4).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: team, error } = await supabase
      .from("teams")
      .select("id, event_id, max_size, status")
      .eq("invite_code", data.invite_code)
      .single();
    if (error || !team) throw new Error("Invalid invite code");
    if (team.status !== "active") throw new Error("Team is not accepting new members");

    const { count } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("status", "active");
    if ((count ?? 0) >= team.max_size) throw new Error("Team is full");

    const { error: mErr } = await supabase
      .from("team_members")
      .insert({ team_id: team.id, user_id: userId, role: "member", status: "active" });
    if (mErr) throw new Error(mErr.message);
    return { team_id: team.id, event_id: team.event_id };
  });

export const leaveTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ team_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_members")
      .delete()
      .eq("team_id", data.team_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ team_id: uuid, user_id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_members")
      .delete()
      .eq("team_id", data.team_id)
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
