
-- Authorization helper for event creation
CREATE OR REPLACE FUNCTION public.can_create_event(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _uid IS NOT NULL
    AND (
      public.has_global_role(_uid, 'admin')
      OR public.has_global_role(_uid, 'faculty')
      OR public.has_global_role(_uid, 'organizer')
      OR public.has_global_role(_uid, 'coordinator')
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _uid
          AND role IN ('organizer','coordinator','faculty','admin')
          AND (expires_at IS NULL OR expires_at > now())
      )
      OR EXISTS (
        SELECT 1 FROM public.permission_delegations
        WHERE delegate_user_id = _uid
          AND role IN ('organizer','coordinator','faculty','admin')
          AND revoked_at IS NULL
          AND expires_at > now()
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_create_event(uuid) TO authenticated, anon;

-- Extend can() to answer 'create_event'
CREATE OR REPLACE FUNCTION public.can(_uid uuid, _action text, _event uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean := public.has_global_role(_uid, 'admin');
  is_faculty boolean := public.has_global_role(_uid, 'faculty');
BEGIN
  IF is_admin THEN RETURN true; END IF;

  CASE _action
    WHEN 'view_event' THEN RETURN true;
    WHEN 'register' THEN RETURN public.has_global_role(_uid, 'student');
    WHEN 'create_team' THEN RETURN public.has_global_role(_uid, 'student');
    WHEN 'submit_project' THEN RETURN public.has_global_role(_uid, 'student');
    WHEN 'create_event' THEN RETURN public.can_create_event(_uid);
    WHEN 'edit_event' THEN
      RETURN is_faculty
        OR (_event IS NOT NULL AND (
             public.has_role_in_event(_uid,'organizer',_event)
             OR public.has_role_in_event(_uid,'coordinator',_event)));
    WHEN 'publish_event' THEN
      RETURN is_faculty
        OR (_event IS NOT NULL AND public.has_role_in_event(_uid,'coordinator',_event));
    WHEN 'manage_teams','approve_registration' THEN
      RETURN is_faculty
        OR (_event IS NOT NULL AND (
             public.has_role_in_event(_uid,'organizer',_event)
             OR public.has_role_in_event(_uid,'coordinator',_event)));
    WHEN 'score_submissions' THEN
      RETURN (_event IS NOT NULL AND public.has_role_in_event(_uid,'judge',_event));
    WHEN 'check_in' THEN
      RETURN is_faculty
        OR (_event IS NOT NULL AND (
             public.has_role_in_event(_uid,'volunteer',_event)
             OR public.has_role_in_event(_uid,'organizer',_event)
             OR public.has_role_in_event(_uid,'coordinator',_event)));
    WHEN 'issue_certificates' THEN
      RETURN is_faculty
        OR (_event IS NOT NULL AND public.has_role_in_event(_uid,'coordinator',_event));
    WHEN 'delete_event' THEN RETURN is_faculty;
    WHEN 'manage_users' THEN RETURN false;
    ELSE RETURN false;
  END CASE;
END;
$function$;

-- Tighten INSERT policy on events: creator must be caller AND caller must be authorized
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authorized users can create events"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.can_create_event(auth.uid()));
