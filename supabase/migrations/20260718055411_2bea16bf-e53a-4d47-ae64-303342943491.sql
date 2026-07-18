
-- === ENUMS ===
CREATE TYPE public.app_role AS ENUM ('student','volunteer','organizer','coordinator','judge','faculty','admin');
CREATE TYPE public.role_scope AS ENUM ('global','organization','event');
CREATE TYPE public.org_type AS ENUM ('college','department','club','external');

-- === PROFILES ===
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  college text,
  department text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- === ORGANIZATIONS ===
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  type public.org_type NOT NULL DEFAULT 'college',
  parent_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- === ORG MEMBERS ===
CREATE TABLE public.org_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.org_members TO authenticated;
GRANT ALL ON public.org_members TO service_role;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- === USER ROLES ===
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  scope public.role_scope NOT NULL DEFAULT 'global',
  scope_id uuid,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT user_roles_scope_id_matches CHECK (
    (scope = 'global' AND scope_id IS NULL) OR (scope <> 'global' AND scope_id IS NOT NULL)
  ),
  UNIQUE (user_id, role, scope, scope_id)
);
CREATE INDEX user_roles_user_idx ON public.user_roles (user_id);
CREATE INDEX user_roles_scope_idx ON public.user_roles (scope, scope_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- === PERMISSION DELEGATIONS ===
CREATE TABLE public.permission_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegate_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  scope public.role_scope NOT NULL,
  scope_id uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX perm_deleg_delegate_idx ON public.permission_delegations (delegate_user_id) WHERE revoked_at IS NULL;
GRANT SELECT ON public.permission_delegations TO authenticated;
GRANT ALL ON public.permission_delegations TO service_role;
ALTER TABLE public.permission_delegations ENABLE ROW LEVEL SECURITY;

-- === AUDIT LOGS ===
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_actor_idx ON public.audit_logs (actor_user_id, created_at DESC);
CREATE INDEX audit_resource_idx ON public.audit_logs (resource_type, resource_id, created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- === SECURITY DEFINER HELPERS ===
CREATE OR REPLACE FUNCTION public.has_global_role(_uid uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role = _role AND scope = 'global'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_org(_uid uuid, _role public.app_role, _org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role = _role AND scope = 'organization' AND scope_id = _org
      AND (expires_at IS NULL OR expires_at > now())
  ) OR public.has_global_role(_uid, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_event(_uid uuid, _role public.app_role, _event uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role = _role AND scope = 'event' AND scope_id = _event
      AND (expires_at IS NULL OR expires_at > now())
  ) OR EXISTS (
    SELECT 1 FROM public.permission_delegations
    WHERE delegate_user_id = _uid AND role = _role AND scope = 'event' AND scope_id = _event
      AND revoked_at IS NULL AND expires_at > now()
  ) OR public.has_global_role(_uid, 'admin');
$$;

-- Central RBAC decision function. Encodes the permission matrix.
CREATE OR REPLACE FUNCTION public.can(_uid uuid, _action text, _event uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    WHEN 'manage_users' THEN RETURN false; -- admin returned true above
    ELSE RETURN false;
  END CASE;
END;
$$;

-- === PROFILE + DEFAULT ROLE ON SIGNUP ===
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role, scope, scope_id)
  VALUES (NEW.id, 'student', 'global', NULL)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- === updated_at TRIGGER ===
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- === RLS POLICIES ===
-- profiles: anyone signed in can view; users update their own; admins update anyone
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_global_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = id OR public.has_global_role(auth.uid(),'admin'));

-- organizations
CREATE POLICY "orgs_select_all" ON public.organizations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "orgs_insert_admin_faculty" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (
    public.has_global_role(auth.uid(),'admin') OR public.has_global_role(auth.uid(),'faculty')
  );
CREATE POLICY "orgs_update_admin_faculty" ON public.organizations
  FOR UPDATE TO authenticated USING (
    public.has_global_role(auth.uid(),'admin') OR public.has_global_role(auth.uid(),'faculty')
  );
CREATE POLICY "orgs_delete_admin" ON public.organizations
  FOR DELETE TO authenticated USING (public.has_global_role(auth.uid(),'admin'));

-- org_members
CREATE POLICY "orgmem_select" ON public.org_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "orgmem_insert" ON public.org_members
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR public.has_role_in_org(auth.uid(),'coordinator',org_id)
    OR public.has_global_role(auth.uid(),'admin')
  );
CREATE POLICY "orgmem_delete" ON public.org_members
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id
    OR public.has_role_in_org(auth.uid(),'coordinator',org_id)
    OR public.has_global_role(auth.uid(),'admin')
  );

-- user_roles: users see own roles; admins see all
CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.has_global_role(auth.uid(),'admin')
  );
-- Writes only via service_role (server functions) -- no INSERT/UPDATE/DELETE policies for authenticated

-- permission_delegations: delegator and delegate can view their rows; admins all
CREATE POLICY "deleg_select_participants_or_admin" ON public.permission_delegations
  FOR SELECT TO authenticated USING (
    delegator_user_id = auth.uid()
    OR delegate_user_id = auth.uid()
    OR public.has_global_role(auth.uid(),'admin')
  );
-- Writes via service_role only

-- audit_logs: users see rows about themselves; admins see all
CREATE POLICY "audit_select_self_or_admin" ON public.audit_logs
  FOR SELECT TO authenticated USING (
    actor_user_id = auth.uid() OR public.has_global_role(auth.uid(),'admin')
  );
-- Inserts via service_role only
