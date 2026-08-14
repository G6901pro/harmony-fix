CREATE UNIQUE INDEX IF NOT EXISTS admin_allowlist_email_lower_key ON public.admin_allowlist (lower(email));
INSERT INTO public.admin_allowlist (email, role)
SELECT 'arabikabir302@gmail.com', 'super_admin'::public.app_role
WHERE NOT EXISTS (SELECT 1 FROM public.admin_allowlist WHERE lower(email) = 'arabikabir302@gmail.com');