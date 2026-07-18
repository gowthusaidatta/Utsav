
-- TEAMS
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  leader_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_size integer NOT NULL DEFAULT 4 CHECK (max_size BETWEEN 1 AND 50),
  invite_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disbanded','locked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, name)
);
CREATE INDEX idx_teams_event ON public.teams(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT ON public.teams TO anon;
GRANT ALL ON public.teams TO service_role;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_select_public" ON public.teams FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status = 'published' AND e.visibility = 'public'));
CREATE POLICY "teams_select_auth" ON public.teams FOR SELECT TO authenticated
  USING (public.can(auth.uid(), 'view_event', event_id));
CREATE POLICY "teams_insert_own" ON public.teams FOR INSERT TO authenticated
  WITH CHECK (leader_user_id = auth.uid() AND public.can(auth.uid(), 'create_team', event_id));
CREATE POLICY "teams_update_leader_or_staff" ON public.teams FOR UPDATE TO authenticated
  USING (leader_user_id = auth.uid() OR public.can(auth.uid(), 'manage_teams', event_id))
  WITH CHECK (leader_user_id = auth.uid() OR public.can(auth.uid(), 'manage_teams', event_id));
CREATE POLICY "teams_delete_leader_or_staff" ON public.teams FOR DELETE TO authenticated
  USING (leader_user_id = auth.uid() OR public.can(auth.uid(), 'manage_teams', event_id));

CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TEAM MEMBERS
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('leader','member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tm_select_related" ON public.team_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND (t.leader_user_id = auth.uid() OR public.can(auth.uid(),'manage_teams',t.event_id)))
    OR EXISTS (SELECT 1 FROM public.team_members m WHERE m.team_id = team_members.team_id AND m.user_id = auth.uid() AND m.status = 'active')
  );
CREATE POLICY "tm_insert_self_or_leader" ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.leader_user_id = auth.uid())
  );
CREATE POLICY "tm_update_leader_or_self" ON public.team_members FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND (t.leader_user_id = auth.uid() OR public.can(auth.uid(),'manage_teams',t.event_id)))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND (t.leader_user_id = auth.uid() OR public.can(auth.uid(),'manage_teams',t.event_id)))
  );
CREATE POLICY "tm_delete_leader_or_self" ON public.team_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND (t.leader_user_id = auth.uid() OR public.can(auth.uid(),'manage_teams',t.event_id)))
  );

-- REGISTRATIONS
CREATE TABLE public.registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','waitlist','cancelled','checked_in','no_show')),
  payment_status text NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required','pending','paid','refunded','failed')),
  payment_reference text,
  notes text,
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX idx_registrations_event ON public.registrations(event_id);
CREATE INDEX idx_registrations_user ON public.registrations(user_id);
CREATE INDEX idx_registrations_status ON public.registrations(event_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reg_select_own_or_staff" ON public.registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can(auth.uid(), 'manage_teams', event_id) OR public.can(auth.uid(), 'check_in', event_id));
CREATE POLICY "reg_insert_self" ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can(auth.uid(), 'register', event_id));
CREATE POLICY "reg_update_self_or_staff" ON public.registrations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can(auth.uid(), 'manage_teams', event_id) OR public.can(auth.uid(), 'check_in', event_id))
  WITH CHECK (user_id = auth.uid() OR public.can(auth.uid(), 'manage_teams', event_id) OR public.can(auth.uid(), 'check_in', event_id));
CREATE POLICY "reg_delete_self_or_staff" ON public.registrations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can(auth.uid(), 'manage_teams', event_id));

CREATE TRIGGER registrations_updated_at BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-add leader as team member on team creation
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role, status)
  VALUES (NEW.id, NEW.leader_user_id, 'leader', 'active')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_team();
