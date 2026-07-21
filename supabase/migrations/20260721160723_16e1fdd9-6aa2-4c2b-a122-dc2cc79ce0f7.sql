DROP POLICY IF EXISTS profiles_public_read_when_public ON public.profiles;
REVOKE SELECT ON public.profiles FROM anon;
COMMENT ON TABLE public.profiles IS 'Anonymous access to profile data is only allowed via public.get_public_profile(username), which honors field_visibility. Direct SELECT by anon is blocked.';