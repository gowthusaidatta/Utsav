
-- role_rank: numeric rank for hierarchy checks
CREATE OR REPLACE FUNCTION public.role_rank(_role public.app_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _role
    WHEN 'super_admin'         THEN 100
    WHEN 'admin'               THEN 100
    WHEN 'platform_admin'      THEN 90
    WHEN 'org_admin'           THEN 75
    WHEN 'college_admin'       THEN 70
    WHEN 'dept_admin'          THEN 60
    WHEN 'coordinator'         THEN 50  -- Faculty Coordinator
    WHEN 'student_coordinator' THEN 40
    WHEN 'organizer'           THEN 30
    WHEN 'judge'               THEN 28
    WHEN 'mentor'              THEN 28
    WHEN 'finance'             THEN 28
    WHEN 'media'               THEN 25
    WHEN 'sponsor'             THEN 25
    WHEN 'volunteer'           THEN 22
    WHEN 'faculty'             THEN 20
    WHEN 'student'             THEN 10
    WHEN 'guest'               THEN 5
    ELSE 0
  END;
$$;

-- max_global_rank: highest global role rank held (0 if none)
CREATE OR REPLACE FUNCTION public.max_global_rank(_uid uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(public.role_rank(role)), 0)
  FROM public.user_roles
  WHERE user_id = _uid
    AND scope = 'global'
    AND (expires_at IS NULL OR expires_at > now());
$$;

-- can_assign_role: actor may only manage roles strictly below their own rank
CREATE OR REPLACE FUNCTION public.can_assign_role(_actor uuid, _target_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.max_global_rank(_actor) > public.role_rank(_target_role);
$$;

-- can_manage_user: actor's max rank must be strictly greater than target's max rank
CREATE OR REPLACE FUNCTION public.can_manage_user(_actor uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _actor <> _target
     AND public.max_global_rank(_actor) > public.max_global_rank(_target);
$$;

REVOKE EXECUTE ON FUNCTION public.role_rank(public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.max_global_rank(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_assign_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_user(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.role_rank(public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.max_global_rank(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_assign_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_user(uuid, uuid) TO authenticated, service_role;

-- Profile identity fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roll_number text,
  ADD COLUMN IF NOT EXISTS faculty_id text,
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS section text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS desired_role public.app_role,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'verified'
    CHECK (verification_status IN ('pending','verified','rejected')),
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_roll_number_uniq
  ON public.profiles (lower(roll_number)) WHERE roll_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_faculty_id_uniq
  ON public.profiles (lower(faculty_id)) WHERE faculty_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_employee_id_uniq
  ON public.profiles (lower(employee_id)) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_verification_status_idx
  ON public.profiles (verification_status);

-- Immutability guard for protected identity fields once verified
CREATE OR REPLACE FUNCTION public.profiles_protect_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  is_super boolean := public.has_any_global_role(actor, ARRAY['super_admin']);
BEGIN
  -- Once verified, protected identity fields are immutable except by super_admin.
  IF OLD.verification_status = 'verified' AND NOT is_super THEN
    IF NEW.roll_number IS DISTINCT FROM OLD.roll_number
       OR NEW.faculty_id IS DISTINCT FROM OLD.faculty_id
       OR NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
      RAISE EXCEPTION 'Protected identity fields are immutable after verification';
    END IF;
  END IF;

  -- verification_status/verified_by/verified_at cannot be self-changed unless super_admin.
  IF actor IS NOT NULL AND actor = NEW.id AND NOT is_super THEN
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
       OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
       OR NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
      RAISE EXCEPTION 'Cannot change your own verification state';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_identity ON public.profiles;
CREATE TRIGGER trg_profiles_protect_identity
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_identity();

-- Rewrite handle_new_user to capture identity + desired role and only auto-assign safe roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  desired public.app_role;
  needs_approval boolean;
BEGIN
  BEGIN
    desired := (meta->>'desired_role')::public.app_role;
  EXCEPTION WHEN others THEN
    desired := NULL;
  END;

  -- Only student and guest are auto-granted. Everything else requires approval.
  needs_approval := desired IS NOT NULL AND desired NOT IN ('student','guest');

  INSERT INTO public.profiles (
    id, email, full_name, avatar_url, phone,
    college, department, roll_number, faculty_id, employee_id,
    academic_year, section, designation,
    desired_role, verification_status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'full_name', meta->>'name'),
    meta->>'avatar_url',
    meta->>'phone',
    meta->>'college',
    meta->>'department',
    meta->>'roll_number',
    meta->>'faculty_id',
    meta->>'employee_id',
    meta->>'academic_year',
    meta->>'section',
    meta->>'designation',
    desired,
    CASE WHEN needs_approval THEN 'pending' ELSE 'verified' END
  );

  IF NOT needs_approval THEN
    INSERT INTO public.user_roles (user_id, role, scope, scope_id)
    VALUES (NEW.id, COALESCE(desired, 'student'), 'global', NULL)
    ON CONFLICT DO NOTHING;

    UPDATE public.profiles
       SET verified_at = now()
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill: existing profiles are considered verified
UPDATE public.profiles
   SET verification_status = 'verified',
       verified_at = COALESCE(verified_at, created_at)
 WHERE verification_status IS NULL OR verification_status = 'pending';
