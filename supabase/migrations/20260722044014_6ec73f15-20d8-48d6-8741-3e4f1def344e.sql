
GRANT EXECUTE ON FUNCTION public.has_any_global_role(uuid, text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.has_global_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_any_role_in_event(uuid, text[], uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role_in_event(uuid, public.app_role, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can(uuid, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.role_rank(public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.max_global_rank(uuid) TO anon;
