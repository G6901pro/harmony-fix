INSERT INTO public.admin_allowlist (email, role)
VALUES ('arabikabir302@gmail.com', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'arabikabir302@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.admin_access_grants (user_id, email, verified_at, expires_at, revoked)
SELECT u.id, u.email, now(), now() + interval '365 days', false
FROM auth.users u
WHERE lower(u.email) = 'arabikabir302@gmail.com';