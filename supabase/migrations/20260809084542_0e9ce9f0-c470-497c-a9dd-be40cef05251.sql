DROP POLICY IF EXISTS "product_media_admin_all" ON storage.objects;
CREATE POLICY "product_media_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'product-media' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'product-media' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "product_media_read" ON storage.objects;
CREATE POLICY "product_media_read" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'product-media');

DROP POLICY IF EXISTS "receipts_owner_insert" ON storage.objects;
CREATE POLICY "receipts_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts' AND owner = auth.uid());

DROP POLICY IF EXISTS "receipts_owner_select" ON storage.objects;
CREATE POLICY "receipts_owner_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND (owner = auth.uid() OR public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "receipts_admin_all" ON storage.objects;
CREATE POLICY "receipts_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'payment-receipts' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'payment-receipts' AND public.is_admin(auth.uid()));

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
INSERT INTO public.admin_allowlist (email, role)
SELECT 'arabikabir302@gmail.com', 'super_admin'::public.app_role
WHERE NOT EXISTS (SELECT 1 FROM public.admin_allowlist WHERE lower(email) = 'arabikabir302@gmail.com');