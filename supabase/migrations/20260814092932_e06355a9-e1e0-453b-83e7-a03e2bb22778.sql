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

CREATE OR REPLACE FUNCTION public.order_item_deduct_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _status public.order_status;
BEGIN
  SELECT o.status INTO _status FROM public.orders o WHERE o.id = NEW.order_id;
  IF _status IN ('cancelled', 'returned') THEN
    RETURN NEW;
  END IF;

  UPDATE public.products
     SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - NEW.quantity, 0),
         updated_at = now()
   WHERE slug = NEW.product_slug;

  INSERT INTO public.inventory_transactions
    (product_slug, product_name, order_id, order_item_id, quantity_delta, reason)
  VALUES
    (NEW.product_slug, NEW.product_name, NEW.order_id, NEW.id, -NEW.quantity, 'order_placed');

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS order_items_deduct_stock_trg ON public.order_items;
CREATE TRIGGER order_items_deduct_stock_trg
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.order_item_deduct_stock();

CREATE OR REPLACE FUNCTION public.order_restore_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'returned') AND OLD.status NOT IN ('cancelled', 'returned') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.inventory_transactions
      WHERE order_id = NEW.id AND reason IN ('order_cancelled', 'order_returned')
    ) THEN
      PERFORM public.apply_order_stock_movement(
        NEW.id, 1,
        CASE WHEN NEW.status = 'returned' THEN 'order_returned' ELSE 'order_cancelled' END
      );
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_restore_stock_trg ON public.orders;
CREATE TRIGGER orders_restore_stock_trg
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.order_restore_stock();

CREATE TABLE IF NOT EXISTS public.admin_seen_markers (
  user_id uuid NOT NULL,
  scope text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, scope)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_seen_markers TO authenticated;
GRANT ALL ON public.admin_seen_markers TO service_role;

ALTER TABLE public.admin_seen_markers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_seen_markers own" ON public.admin_seen_markers;
CREATE POLICY "admin_seen_markers own" ON public.admin_seen_markers FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _num text;
BEGIN
  LOOP
    _num := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 100000)::text, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = _num);
  END LOOP;
  RETURN _num;
END; $$;

CREATE OR REPLACE FUNCTION public.ensure_order_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_status IN ('approved', 'paid')
     OR NEW.status IN ('payment_approved','order_confirmed','processing','packed','shipped','out_for_delivery','delivered') THEN
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE order_id = NEW.id) THEN
      INSERT INTO public.invoices (order_id, user_id, invoice_number, amount, status, issued_at)
      VALUES (
        NEW.id, NEW.user_id, public.generate_invoice_number(), NEW.total,
        CASE WHEN NEW.payment_status IN ('approved','paid') THEN 'paid' ELSE 'unpaid' END,
        now()
      );
    ELSIF NEW.payment_status IN ('approved','paid') THEN
      UPDATE public.invoices SET status = 'paid', amount = NEW.total WHERE order_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_ensure_invoice_trg ON public.orders;
CREATE TRIGGER orders_ensure_invoice_trg
AFTER INSERT OR UPDATE OF status, payment_status, total ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.ensure_order_invoice();

CREATE OR REPLACE FUNCTION public.notify_order_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _label text;
  _num text := COALESCE(NEW.order_number, 'your order');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (NEW.user_id, 'order', 'Order placed',
            'We have received ' || _num || '. We will confirm it shortly.',
            '/account/orders');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _label := replace(initcap(replace(NEW.status::text, '_', ' ')), 'Cod', 'COD');
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (NEW.user_id, 'order', 'Order update — ' || _label,
            _num || ' is now ' || lower(_label) || '.',
            '/account/tracking/' || NEW.id::text);
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (NEW.user_id, 'payment',
            CASE
              WHEN NEW.payment_status IN ('approved','paid') THEN 'Payment approved'
              WHEN NEW.payment_status = 'rejected' THEN 'Payment needs attention'
              ELSE 'Payment update'
            END,
            'Payment for ' || _num || ' is ' || NEW.payment_status ||
              COALESCE('. ' || NEW.payment_rejection_reason, '.'),
            '/account/orders');
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_notify_trg ON public.orders;
CREATE TRIGGER orders_notify_trg
AFTER INSERT OR UPDATE OF status, payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_change();

CREATE OR REPLACE FUNCTION public.notify_delivery_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid; _num text;
BEGIN
  SELECT o.user_id, COALESCE(o.order_number, 'your order') INTO _user, _num
    FROM public.orders o WHERE o.id = NEW.order_id;
  IF _user IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' OR NEW.delivery_status IS DISTINCT FROM OLD.delivery_status THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (_user, 'delivery', 'Delivery update',
            _num || ' delivery status: ' || NEW.delivery_status ||
              COALESCE('. Tracking ' || NEW.tracking_number, '.'),
            '/account/tracking/' || NEW.order_id::text);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS deliveries_notify_trg ON public.deliveries;
CREATE TRIGGER deliveries_notify_trg
AFTER INSERT OR UPDATE OF delivery_status, tracking_number ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.notify_delivery_change();

CREATE UNIQUE INDEX IF NOT EXISTS admin_allowlist_email_lower_key ON public.admin_allowlist (lower(email));

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();