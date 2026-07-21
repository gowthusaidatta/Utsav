
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_type text NOT NULL DEFAULT 'individual'
    CHECK (registration_type IN ('individual','team')),
  ADD COLUMN IF NOT EXISTS min_team_size integer,
  ADD COLUMN IF NOT EXISTS max_team_size integer,
  ADD COLUMN IF NOT EXISTS team_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_teams integer,
  ADD COLUMN IF NOT EXISTS attendance_rule text NOT NULL DEFAULT 'member'
    CHECK (attendance_rule IN ('member','leader','all_members','any_member')),
  ADD COLUMN IF NOT EXISTS certificate_rule text NOT NULL DEFAULT 'attended'
    CHECK (certificate_rule IN ('attended','registered','winners','top_performers','custom')),
  ADD COLUMN IF NOT EXISTS qr_secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex');

CREATE OR REPLACE FUNCTION public.events_lock_reg_type()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.registration_type IS DISTINCT FROM OLD.registration_type THEN
    IF EXISTS (SELECT 1 FROM public.registrations WHERE event_id = OLD.id) THEN
      RAISE EXCEPTION 'Cannot change registration_type after registrations exist';
    END IF;
  END IF;
  IF NEW.registration_type = 'team' THEN
    IF COALESCE(NEW.min_team_size, 0) < 2 THEN
      RAISE EXCEPTION 'Minimum team size must be at least 2';
    END IF;
    IF COALESCE(NEW.max_team_size, 0) < NEW.min_team_size THEN
      RAISE EXCEPTION 'Maximum team size must be >= minimum team size';
    END IF;
    IF NEW.max_team_size > 100 THEN
      RAISE EXCEPTION 'Team size cannot exceed platform limit (100)';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS events_lock_reg_type ON public.events;
CREATE TRIGGER events_lock_reg_type BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.events_lock_reg_type();

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS min_size integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS auto_accept boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text,
  invited_username text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','revoked','expired')),
  message text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (invited_user_id IS NOT NULL OR invited_email IS NOT NULL OR invited_username IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_team_invites_team ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_user ON public.team_invites(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_email ON public.team_invites(lower(invited_email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ti_select_related" ON public.team_invites FOR SELECT TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR invited_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND (t.leader_user_id = auth.uid() OR public.can(auth.uid(),'manage_teams', t.event_id)))
  );
CREATE POLICY "ti_insert_leader" ON public.team_invites FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND (t.leader_user_id = auth.uid() OR public.can(auth.uid(),'manage_teams', t.event_id)))
  );
CREATE POLICY "ti_update_related" ON public.team_invites FOR UPDATE TO authenticated
  USING (invited_user_id = auth.uid() OR invited_by = auth.uid() OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.leader_user_id = auth.uid()))
  WITH CHECK (invited_user_id = auth.uid() OR invited_by = auth.uid() OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.leader_user_id = auth.uid()));
CREATE POLICY "ti_delete_leader" ON public.team_invites FOR DELETE TO authenticated
  USING (invited_by = auth.uid() OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.leader_user_id = auth.uid()));

CREATE TRIGGER team_invites_updated_at BEFORE UPDATE ON public.team_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS qr_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(24),'base64'),
  ADD COLUMN IF NOT EXISTS qr_revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS walk_in boolean NOT NULL DEFAULT false;

UPDATE public.registrations SET qr_token = encode(extensions.gen_random_bytes(24),'base64') WHERE qr_token IS NULL;
ALTER TABLE public.registrations ALTER COLUMN qr_token SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('check_in','check_out','undo','manual_check_in','walk_in')),
  operator_id uuid REFERENCES auth.users(id),
  method text CHECK (method IN ('qr_camera','qr_scanner','manual','bulk_import','api')),
  device_info text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_att_log_event ON public.attendance_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_att_log_reg ON public.attendance_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_att_log_user ON public.attendance_logs(user_id);

GRANT SELECT, INSERT ON public.attendance_logs TO authenticated;
GRANT ALL ON public.attendance_logs TO service_role;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "att_select_self_or_staff" ON public.attendance_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can(auth.uid(),'check_in', event_id) OR public.can(auth.uid(),'manage_teams', event_id));
CREATE POLICY "att_insert_staff" ON public.attendance_logs FOR INSERT TO authenticated
  WITH CHECK (public.can(auth.uid(),'check_in', event_id) OR public.can(auth.uid(),'manage_teams', event_id));

INSERT INTO public.role_permissions(action, label, category, global_roles, event_roles, is_public, is_self_service)
VALUES
  ('scan_qr','Scan attendance QR','attendance', ARRAY['admin','super_admin','platform_admin','org_admin','college_admin','dept_admin','faculty','coordinator']::text[], ARRAY['organizer','coordinator','volunteer']::text[], false, false),
  ('undo_attendance','Undo attendance','attendance', ARRAY['admin','super_admin','platform_admin','org_admin','college_admin','dept_admin','faculty','coordinator']::text[], ARRAY['organizer','coordinator']::text[], false, false),
  ('manual_attendance','Mark manual attendance','attendance', ARRAY['admin','super_admin','platform_admin','org_admin','college_admin','dept_admin','faculty','coordinator']::text[], ARRAY['organizer','coordinator']::text[], false, false),
  ('export_attendance','Export attendance','attendance', ARRAY['admin','super_admin','platform_admin','org_admin','college_admin','dept_admin','faculty','coordinator']::text[], ARRAY['organizer','coordinator']::text[], false, false)
ON CONFLICT (action) DO UPDATE
  SET global_roles = EXCLUDED.global_roles,
      event_roles = EXCLUDED.event_roles,
      category = EXCLUDED.category,
      label = EXCLUDED.label;

CREATE OR REPLACE FUNCTION public.verify_registration_qr(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reg record;
  prof record;
BEGIN
  SELECT r.id, r.event_id, r.user_id, r.team_id, r.status, r.checked_in_at, r.qr_revoked_at,
         e.title AS event_title, e.registration_type, e.attendance_rule
    INTO reg
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.qr_token = _token
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_token');
  END IF;
  IF reg.qr_revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'revoked');
  END IF;
  IF reg.status = 'cancelled' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'cancelled');
  END IF;
  SELECT id, full_name, email, avatar_url, college, department FROM public.profiles WHERE id = reg.user_id INTO prof;
  RETURN jsonb_build_object(
    'valid', true,
    'registration_id', reg.id,
    'event_id', reg.event_id,
    'event_title', reg.event_title,
    'user_id', reg.user_id,
    'team_id', reg.team_id,
    'status', reg.status,
    'checked_in_at', reg.checked_in_at,
    'already_checked_in', (reg.checked_in_at IS NOT NULL),
    'profile', to_jsonb(prof)
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.verify_registration_qr(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_registration_qr(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.event_attendance_stats(_event uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'registered', (SELECT count(*) FROM public.registrations WHERE event_id = _event AND status IN ('registered','checked_in')),
    'checked_in', (SELECT count(*) FROM public.registrations WHERE event_id = _event AND status = 'checked_in'),
    'pending', (SELECT count(*) FROM public.registrations WHERE event_id = _event AND status = 'registered' AND checked_in_at IS NULL),
    'cancelled', (SELECT count(*) FROM public.registrations WHERE event_id = _event AND status = 'cancelled'),
    'walk_ins', (SELECT count(*) FROM public.registrations WHERE event_id = _event AND walk_in = true),
    'no_show', (SELECT count(*) FROM public.registrations WHERE event_id = _event AND status = 'no_show')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.event_attendance_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_attendance_stats(uuid) TO authenticated;
