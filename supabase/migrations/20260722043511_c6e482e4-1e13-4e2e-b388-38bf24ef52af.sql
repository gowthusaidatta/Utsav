
-- Tighten event child-table visibility: drop broad authed-read policies
DROP POLICY IF EXISTS announcements_read_authed ON public.event_announcements;
DROP POLICY IF EXISTS faqs_read_authed ON public.event_faqs;
DROP POLICY IF EXISTS feedback_read_authed ON public.event_feedback;

-- Username history: owner or platform admin only
DROP POLICY IF EXISTS username_history_public_read ON public.username_history;
CREATE POLICY username_history_read_owner_or_admin
  ON public.username_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- Certificates: drop broad public row read; public verification path uses verify flow / get_public_profile RPC
DROP POLICY IF EXISTS certificates_public_read ON public.certificates;

-- Revoke anon EXECUTE on SECURITY DEFINER functions that don't need public access.
-- Keep get_public_profile executable by anon (public profile pages depend on it).
REVOKE EXECUTE ON FUNCTION public.event_attendance_stats(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_registration_qr(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.events_lock_reg_type() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profiles_track_username_change() FROM anon, authenticated, PUBLIC;
