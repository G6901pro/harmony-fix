CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone text := NULLIF(NEW.raw_user_meta_data->>'phone', '');
BEGIN
  -- A phone number already claimed by another account must not abort sign-up.
  IF _phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id <> NEW.id
      AND public.normalize_bd_phone(p.phone) IS NOT DISTINCT FROM public.normalize_bd_phone(_phone)
      AND public.normalize_bd_phone(_phone) IS NOT NULL
  ) THEN
    _phone := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''), '@', 1)),
    NEW.email,
    _phone
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.phone_is_available(p_phone text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.normalize_bd_phone(p_phone) IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE public.normalize_bd_phone(p.phone) = public.normalize_bd_phone(p_phone)
      )
$function$;

REVOKE ALL ON FUNCTION public.phone_is_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phone_is_available(text) TO anon, authenticated, service_role;