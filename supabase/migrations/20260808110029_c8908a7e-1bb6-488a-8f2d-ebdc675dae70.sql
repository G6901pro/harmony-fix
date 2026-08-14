CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin', 'admin', 'staff'))
$$;

CREATE OR REPLACE FUNCTION public.has_verified_admin_access(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_access_grants g
    WHERE g.user_id = _user_id AND g.revoked = false AND g.expires_at > now()
  )
$$;

CREATE OR REPLACE FUNCTION public.account_is_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND COALESCE(p.is_blocked, false) = false AND p.deleted_at IS NULL
  )
$$;

CREATE OR REPLACE FUNCTION public.normalize_bd_phone(p_phone text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN p_phone IS NULL OR btrim(p_phone) = '' THEN NULL
    ELSE (
      SELECT CASE
        WHEN length(digits) = 11 AND digits LIKE '01%' THEN '+88' || digits
        WHEN length(digits) = 13 AND digits LIKE '880%' THEN '+' || digits
        WHEN length(digits) = 14 AND digits LIKE '+880%' THEN digits
        WHEN length(digits) = 10 AND digits LIKE '1%' THEN '+880' || digits
        ELSE '+' || regexp_replace(digits, '^\+', '')
      END
      FROM (SELECT regexp_replace(p_phone, '[^0-9+]', '', 'g') AS digits) s
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.login_email_for_phone(p_phone text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.email FROM public.profiles p
  WHERE public.normalize_bd_phone(p.phone) = public.normalize_bd_phone(p_phone)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.phone_is_available(p_phone text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT public.normalize_bd_phone(p_phone) IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE public.normalize_bd_phone(p.phone) = public.normalize_bd_phone(p_phone)
      )
$$;

CREATE OR REPLACE FUNCTION public.claim_admin_role()
RETURNS public.app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _email text;
  _role public.app_role;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO _role FROM public.admin_allowlist WHERE lower(email) = lower(_email);
  IF _role IS NULL THEN
    RAISE EXCEPTION 'Not on admin allowlist';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _role;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_delivered_purchase(_user_id uuid, _product_slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.user_id = _user_id AND oi.product_slug = _product_slug AND o.status = 'delivered'
  )
$$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _num text;
BEGIN
  LOOP
    _num := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 100000)::text, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = _num);
  END LOOP;
  RETURN _num;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_set_order_number_trg ON public.orders;
CREATE TRIGGER orders_set_order_number_trg
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

CREATE OR REPLACE FUNCTION public.apply_order_stock_movement(_order_id uuid, _direction integer, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _item record;
BEGIN
  FOR _item IN SELECT * FROM public.order_items WHERE order_id = _order_id LOOP
    UPDATE public.products
      SET stock_quantity = GREATEST(stock_quantity + (_direction * _item.quantity), 0)
      WHERE slug = _item.product_slug;

    INSERT INTO public.inventory_transactions
      (product_slug, product_name, order_id, order_item_id, quantity_delta, reason)
    VALUES
      (_item.product_slug, _item.product_name, _order_id, _item.id, _direction * _item.quantity, _reason);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_my_order(p_order_id uuid)
RETURNS TABLE (order_id uuid, status public.order_status)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO _order FROM public.orders o WHERE o.id = p_order_id AND o.user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF _order.status NOT IN ('order_pending', 'pending_payment', 'payment_under_review', 'payment_approved', 'order_confirmed', 'processing') THEN
    RAISE EXCEPTION 'Order can no longer be cancelled';
  END IF;

  UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = p_order_id;
  INSERT INTO public.order_events (order_id, status, note) VALUES (p_order_id, 'cancelled', 'Cancelled by customer');

  IF _order.payment_status = 'paid' OR _order.status NOT IN ('order_pending','pending_payment') THEN
    PERFORM public.apply_order_stock_movement(p_order_id, 1, 'order_cancelled');
  END IF;

  RETURN QUERY SELECT p_order_id, 'cancelled'::public.order_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_stale_unpaid_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
BEGIN
  WITH stale AS (
    UPDATE public.orders
    SET status = 'cancelled', updated_at = now()
    WHERE status IN ('order_pending', 'pending_payment')
      AND payment_verified = false
      AND placed_at < now() - interval '24 hours'
    RETURNING id
  )
  SELECT count(*) INTO _count FROM stale;

  RETURN COALESCE(_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_coupon(p_code text, p_subtotal numeric)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _c public.coupons%ROWTYPE;
  _discount numeric := 0;
BEGIN
  SELECT * INTO _c FROM public.coupons WHERE lower(code) = lower(p_code);

  IF NOT FOUND OR NOT _c.is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF _c.assigned_user_id IS NOT NULL AND _c.assigned_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_assigned');
  END IF;

  IF _c.starts_at IS NOT NULL AND _c.starts_at > now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_started');
  END IF;

  IF _c.expires_at IS NOT NULL AND _c.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  IF _c.usage_limit IS NOT NULL AND _c.used_count >= _c.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'usage_limit_reached');
  END IF;

  IF p_subtotal < _c.min_order_total THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'min_order_not_met', 'min_order_total', _c.min_order_total);
  END IF;

  IF _c.discount_type IN ('amount', 'fixed') THEN
    _discount := LEAST(_c.discount_value, p_subtotal);
  ELSE
    _discount := round(p_subtotal * (_c.discount_value / 100.0), 2);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code', _c.code,
    'discount_type', _c.discount_type,
    'discount_value', _c.discount_value,
    'discount_amount', _discount
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_coupon(p_code text, p_order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _c public.coupons%ROWTYPE;
BEGIN
  SELECT * INTO _c FROM public.coupons WHERE lower(code) = lower(p_code) FOR UPDATE;

  IF NOT FOUND OR NOT _c.is_active THEN
    RETURN false;
  END IF;

  IF _c.usage_limit IS NOT NULL AND _c.used_count >= _c.usage_limit THEN
    RETURN false;
  END IF;

  UPDATE public.coupons SET used_count = used_count + 1, updated_at = now() WHERE id = _c.id;
  UPDATE public.orders SET coupon_code = _c.code WHERE id = p_order_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _phone text := NULLIF(NEW.raw_user_meta_data->>'phone', '');
BEGIN
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
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'categories','collections','products','product_option_groups','product_option_values',
    'product_variants','orders','order_returns','deliveries','reviews','coupons',
    'homepage_blocks','shipping_zones','site_settings','profiles'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_set_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER %I_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.phone_is_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phone_is_available(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.login_email_for_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_email_for_phone(text) TO anon, authenticated, service_role;