
-- 1. Fix profiles SELECT: self or platform admins/faculty
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_self_or_staff ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.is_platform_admin(auth.uid())
    OR public.has_global_role(auth.uid(), 'faculty')
  );

-- 2. Fix certificates SELECT: owner or staff
DROP POLICY IF EXISTS certificates_read_all_authenticated ON public.certificates;
CREATE POLICY certificates_read_owner_or_staff ON public.certificates
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR public.has_global_role(auth.uid(), 'faculty')
    OR public.has_role_in_event(auth.uid(), 'coordinator', event_id)
    OR public.has_role_in_event(auth.uid(), 'organizer', event_id)
  );

-- 3. Fix notification_templates SELECT: admin/faculty only
DROP POLICY IF EXISTS ntpl_read_authenticated ON public.notification_templates;
CREATE POLICY ntpl_read_admin_faculty ON public.notification_templates
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR public.has_global_role(auth.uid(), 'faculty')
  );

-- 4. Fix org_members SELECT: self, co-members, or admin/coordinator
DROP POLICY IF EXISTS orgmem_select ON public.org_members;
CREATE POLICY orgmem_select_scoped ON public.org_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
    OR public.has_role_in_org(auth.uid(), 'coordinator', org_id)
    OR EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.org_id = org_members.org_id AND m.user_id = auth.uid()
    )
  );

-- 5. Fix teams: drop public/anon SELECT policy
DROP POLICY IF EXISTS teams_select_public ON public.teams;

-- 6. Fix storage.certificates SELECT: owner (via certificates table) or admin
DROP POLICY IF EXISTS storage_certificates_read_authenticated ON storage.objects;
CREATE POLICY storage_certificates_read_owner_or_admin ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (
      public.is_platform_admin(auth.uid())
      OR public.has_global_role(auth.uid(), 'faculty')
      OR EXISTS (
        SELECT 1 FROM public.certificates c
        WHERE c.storage_path = storage.objects.name
          AND c.user_id = auth.uid()
      )
    )
  );

-- 7. Fix storage.media SELECT: owner or admin
DROP POLICY IF EXISTS storage_media_read_authenticated ON storage.objects;
CREATE POLICY storage_media_read_owner_or_admin ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'media'
    AND (
      owner = auth.uid()
      OR public.is_platform_admin(auth.uid())
      OR public.has_global_role(auth.uid(), 'faculty')
    )
  );

-- 8. Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 9. Revoke EXECUTE from anon/public on all SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.has_global_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_global_role(uuid, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role_in_org(uuid, app_role, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role_in_event(uuid, app_role, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role_in_event(uuid, text[], uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_user(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_assign_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_create_event(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.max_global_rank(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.role_rank(app_role) FROM PUBLIC, anon;
