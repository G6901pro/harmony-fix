ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS inside_dhaka_delivery_charge numeric NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS outside_dhaka_delivery_charge numeric NOT NULL DEFAULT 120;

DROP POLICY IF EXISTS "read active public coupons" ON public.coupons;
CREATE POLICY "read active public coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (assigned_user_id IS NULL AND is_active = true);