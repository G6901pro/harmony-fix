-- Stock now leaves inventory only when an order is confirmed by an admin.
DROP TRIGGER IF EXISTS order_items_deduct_stock_trg ON public.order_items;

CREATE OR REPLACE FUNCTION public.order_confirm_deduct_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('order_confirmed','processing','packed','shipped','out_for_delivery','delivered') THEN
    -- exactly once per order, no matter how many times the status is saved
    IF NOT EXISTS (
      SELECT 1 FROM public.inventory_transactions
      WHERE order_id = NEW.id AND reason IN ('order_confirmed','order_placed')
    ) THEN
      PERFORM public.apply_order_stock_movement(NEW.id, -1, 'order_confirmed');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_confirm_deduct_stock_trg ON public.orders;
CREATE TRIGGER orders_confirm_deduct_stock_trg
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.order_confirm_deduct_stock();

-- Restore stock on cancel/return only when it was actually deducted.
CREATE OR REPLACE FUNCTION public.order_restore_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'returned') AND OLD.status NOT IN ('cancelled', 'returned') THEN
    IF EXISTS (
      SELECT 1 FROM public.inventory_transactions
      WHERE order_id = NEW.id AND reason IN ('order_confirmed','order_placed')
    ) AND NOT EXISTS (
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
END;
$$;