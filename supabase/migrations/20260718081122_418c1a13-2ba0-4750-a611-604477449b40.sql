INSERT INTO public.user_roles (user_id, role, scope, scope_id)
VALUES ('7280c0ba-71fb-4641-ae65-825e7f6874b2', 'admin', 'global', NULL)
ON CONFLICT DO NOTHING;