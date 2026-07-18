
-- Platform-level admin (any of admin, super_admin, platform_admin) with global scope
CREATE OR REPLACE FUNCTION public.is_platform_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND scope = 'global'
      AND role::text IN ('admin','super_admin','platform_admin')
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- has_any_global_role: true if user has ANY of the given role names at global scope
CREATE OR REPLACE FUNCTION public.has_any_global_role(_uid uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND scope = 'global'
      AND role::text = ANY(_roles)
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- has_any_role_in_event: same idea, but scope='event'
CREATE OR REPLACE FUNCTION public.has_any_role_in_event(_uid uuid, _roles text[], _event uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND scope = 'event' AND scope_id = _event
      AND role::text = ANY(_roles)
      AND (expires_at IS NULL OR expires_at > now())
  ) OR EXISTS (
    SELECT 1 FROM public.permission_delegations
    WHERE delegate_user_id = _uid AND scope = 'event' AND scope_id = _event
      AND role::text = ANY(_roles)
      AND revoked_at IS NULL AND expires_at > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid), public.has_any_global_role(uuid, text[]), public.has_any_role_in_event(uuid, text[], uuid) TO authenticated, anon;

-- can_create_event now recognises all admin variants + org/college/dept admins
CREATE OR REPLACE FUNCTION public.can_create_event(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    _uid IS NOT NULL
    AND (
      public.has_any_global_role(_uid, ARRAY[
        'admin','super_admin','platform_admin',
        'org_admin','college_admin','dept_admin',
        'faculty','organizer','coordinator'
      ])
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _uid
          AND role::text IN (
            'admin','super_admin','platform_admin',
            'org_admin','college_admin','dept_admin',
            'faculty','organizer','coordinator'
          )
          AND (expires_at IS NULL OR expires_at > now())
      )
      OR EXISTS (
        SELECT 1 FROM public.permission_delegations
        WHERE delegate_user_id = _uid
          AND role::text IN (
            'admin','super_admin','platform_admin',
            'org_admin','college_admin','dept_admin',
            'faculty','organizer','coordinator'
          )
          AND revoked_at IS NULL AND expires_at > now()
      )
    );
$$;

-- Full can() rewrite with the 16-role matrix
CREATE OR REPLACE FUNCTION public.can(_uid uuid, _action text, _event uuid DEFAULT NULL::uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_platform boolean := public.is_platform_admin(_uid);
  is_faculty  boolean := public.has_global_role(_uid, 'faculty');
  is_orgish   boolean := public.has_any_global_role(_uid, ARRAY['org_admin','college_admin','dept_admin']);
BEGIN
  -- Platform-level admins can do anything
  IF is_platform THEN RETURN true; END IF;

  CASE _action
    -- Anyone (including anonymous) can view public events; RLS filters visibility
    WHEN 'view_event' THEN
      RETURN true;

    -- Student-audience actions
    WHEN 'register', 'create_team', 'submit_project' THEN
      RETURN public.has_global_role(_uid, 'student');

    -- Event authoring
    WHEN 'create_event' THEN
      RETURN public.can_create_event(_uid);

    WHEN 'edit_event' THEN
      RETURN is_faculty OR is_orgish
        OR (_event IS NOT NULL AND public.has_any_role_in_event(_uid, ARRAY['organizer','coordinator'], _event));

    WHEN 'publish_event' THEN
      RETURN is_faculty OR is_orgish
        OR (_event IS NOT NULL AND public.has_any_role_in_event(_uid, ARRAY['coordinator'], _event));

    WHEN 'manage_teams', 'approve_registration' THEN
      RETURN is_faculty OR is_orgish
        OR (_event IS NOT NULL AND public.has_any_role_in_event(_uid, ARRAY['organizer','coordinator'], _event));

    WHEN 'score_submissions' THEN
      RETURN _event IS NOT NULL
        AND public.has_any_role_in_event(_uid, ARRAY['judge'], _event);

    WHEN 'check_in' THEN
      RETURN is_faculty OR is_orgish
        OR (_event IS NOT NULL AND public.has_any_role_in_event(_uid, ARRAY['volunteer','organizer','coordinator'], _event));

    WHEN 'issue_certificates' THEN
      RETURN is_faculty OR is_orgish
        OR (_event IS NOT NULL AND public.has_any_role_in_event(_uid, ARRAY['coordinator'], _event));

    WHEN 'delete_event' THEN
      RETURN is_faculty;

    -- Platform-only actions (platform admins short-circuited above return false here)
    WHEN 'manage_users' THEN
      RETURN false;

    WHEN 'manage_organizations' THEN
      RETURN public.has_any_global_role(_uid, ARRAY['org_admin','college_admin']);

    WHEN 'view_finance' THEN
      RETURN public.has_any_global_role(_uid, ARRAY['finance','org_admin']);

    WHEN 'manage_media' THEN
      RETURN public.has_any_global_role(_uid, ARRAY['media','faculty','org_admin','college_admin','dept_admin'])
        OR (_event IS NOT NULL AND public.has_any_role_in_event(_uid, ARRAY['organizer','coordinator','media'], _event));

    WHEN 'mentor_teams' THEN
      RETURN _event IS NOT NULL
        AND public.has_any_role_in_event(_uid, ARRAY['mentor'], _event);

    WHEN 'sponsor_view' THEN
      RETURN public.has_global_role(_uid, 'sponsor')
        OR (_event IS NOT NULL AND public.has_any_role_in_event(_uid, ARRAY['sponsor'], _event));

    WHEN 'view_audit_logs' THEN
      RETURN is_orgish OR is_faculty;

    ELSE RETURN false;
  END CASE;
END;
$$;
