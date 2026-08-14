-- 1. Automatic stock deduction when order lines are created
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

-- 2. Restore stock exactly once when an order is cancelled or returned
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

-- cancel_my_order no longer restores stock itself (the trigger owns it)
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

-- 3. Admin "last seen" markers for unread badges
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

-- 4. Live updates for admin screens
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;