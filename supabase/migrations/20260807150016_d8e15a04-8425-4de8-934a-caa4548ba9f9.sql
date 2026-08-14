DROP POLICY IF EXISTS "read active public coupons" ON public.coupons;
CREATE POLICY "read active public coupons"
ON public.coupons FOR SELECT TO authenticated
USING (assigned_user_id IS NULL AND is_active = true);

CREATE OR REPLACE FUNCTION public.notify_customer_coupon()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _body text;
BEGIN
  IF NOT COALESCE(NEW.is_active, false) THEN RETURN NEW; END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.assigned_user_id IS NOT DISTINCT FROM NEW.assigned_user_id
     AND COALESCE(OLD.is_active, false) = COALESCE(NEW.is_active, false)
     AND OLD.code = NEW.code THEN
    RETURN NEW;
  END IF;

  _body := 'Use code ' || NEW.code || ' for ' ||
    CASE WHEN NEW.discount_type IN ('amount','fixed')
      THEN to_char(NEW.discount_value, 'FM999999990') || ' off'
      ELSE to_char(NEW.discount_value, 'FM999990') || '% off' END ||
    COALESCE('. ' || NEW.terms, '.');

  IF NEW.assigned_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    SELECT NEW.assigned_user_id, 'coupon', 'A coupon just landed', _body, '/shop'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = NEW.assigned_user_id
        AND n.kind = 'coupon'
        AND n.body LIKE 'Use code ' || NEW.code || ' %'
    );
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, link)
  SELECT p.id, 'coupon', 'A new coupon for everyone', _body, '/shop'
    FROM public.profiles p
   WHERE COALESCE(p.is_blocked, false) = false
     AND p.deleted_at IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.notifications n
       WHERE n.user_id = p.id
         AND n.kind = 'coupon'
         AND n.body LIKE 'Use code ' || NEW.code || ' %'
     );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS coupons_notify_customer_trg ON public.coupons;
CREATE TRIGGER coupons_notify_customer_trg
AFTER INSERT OR UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.notify_customer_coupon();

CREATE OR REPLACE FUNCTION public.notify_new_customer_public_coupons()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, link)
  SELECT NEW.id, 'coupon', 'A new coupon for everyone',
         'Use code ' || c.code || ' for ' ||
           CASE WHEN c.discount_type IN ('amount','fixed')
             THEN to_char(c.discount_value, 'FM999999990') || ' off'
             ELSE to_char(c.discount_value, 'FM999990') || '% off' END ||
           COALESCE('. ' || c.terms, '.'),
         '/shop'
    FROM public.coupons c
   WHERE c.assigned_user_id IS NULL
     AND COALESCE(c.is_active, false)
     AND (c.starts_at IS NULL OR c.starts_at <= now())
     AND (c.expires_at IS NULL OR c.expires_at > now())
     AND (c.usage_limit IS NULL OR COALESCE(c.used_count, 0) < c.usage_limit);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_public_coupons_trg ON public.profiles;
CREATE TRIGGER profiles_public_coupons_trg
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_new_customer_public_coupons();