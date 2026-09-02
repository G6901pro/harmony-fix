REVOKE EXECUTE ON FUNCTION public.evaluate_vip_status(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.orders_evaluate_vip() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.coupons_notify_assignment() FROM anon, authenticated, public;