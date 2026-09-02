-- =========================================================
-- VIP customer system
-- =========================================================
CREATE TABLE public.vip_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  is_enabled boolean NOT NULL DEFAULT true,
  threshold_amount numeric NOT NULL DEFAULT 10000,
  window_days integer NOT NULL DEFAULT 30,
  membership_days integer NOT NULL DEFAULT 365,
  tier_label text NOT NULL DEFAULT 'VIP',
  benefits text[] NOT NULL DEFAULT ARRAY[
    'Priority concierge support',
    'Free express delivery',
    'Early access to new arrivals',
    'Exclusive VIP-only coupons'
  ],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vip_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.vip_settings TO authenticated;
GRANT ALL ON public.vip_settings TO service_role;

ALTER TABLE public.vip_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VIP settings are readable by anyone"
  ON public.vip_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert VIP settings"
  ON public.vip_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update VIP settings"
  ON public.vip_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.vip_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.vip_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'VIP',
  qualified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  qualifying_total numeric NOT NULL DEFAULT 0,
  granted_manually boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vip_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_members TO authenticated;
GRANT ALL ON public.vip_members TO service_role;

ALTER TABLE public.vip_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VIP membership is publicly readable"
  ON public.vip_members FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can insert VIP members"
  ON public.vip_members FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update VIP members"
  ON public.vip_members FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete VIP members"
  ON public.vip_members FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER vip_settings_updated_at
  BEFORE UPDATE ON public.vip_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER vip_members_updated_at
  BEFORE UPDATE ON public.vip_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Evaluate a customer's VIP eligibility from confirmed orders only.
CREATE OR REPLACE FUNCTION public.evaluate_vip_status(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.vip_settings;
  spend numeric;
  already boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  SELECT * INTO s FROM public.vip_settings WHERE id LIMIT 1;
  IF s IS NULL OR NOT s.is_enabled THEN RETURN; END IF;

  SELECT COALESCE(SUM(total), 0) INTO spend
  FROM public.orders
  WHERE user_id = _user_id
    AND status IN ('order_confirmed','processing','packed','shipped','out_for_delivery','delivered')
    AND placed_at >= now() - (s.window_days || ' days')::interval;

  IF spend < s.threshold_amount THEN RETURN; END IF;

  SELECT EXISTS (SELECT 1 FROM public.vip_members WHERE user_id = _user_id) INTO already;

  INSERT INTO public.vip_members (user_id, tier, qualified_at, expires_at, qualifying_total)
  VALUES (_user_id, s.tier_label, now(), now() + (s.membership_days || ' days')::interval, spend)
  ON CONFLICT (user_id) DO UPDATE
    SET qualifying_total = GREATEST(public.vip_members.qualifying_total, EXCLUDED.qualifying_total),
        expires_at = GREATEST(COALESCE(public.vip_members.expires_at, EXCLUDED.expires_at), EXCLUDED.expires_at),
        updated_at = now();

  IF NOT already THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link)
    SELECT _user_id, 'vip',
           'You are now a ' || s.tier_label || ' member',
           'Your qualifying purchases unlocked ' || s.tier_label || ' status and its exclusive benefits.',
           '/account/profile'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = _user_id AND kind = 'vip' AND link = '/account/profile'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.orders_evaluate_vip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('order_confirmed','processing','packed','shipped','out_for_delivery','delivered') THEN
    PERFORM public.evaluate_vip_status(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_evaluate_vip_trigger ON public.orders;
CREATE TRIGGER orders_evaluate_vip_trigger
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_evaluate_vip();

-- =========================================================
-- Coupon assignment notifications (deduplicated per coupon)
-- =========================================================
CREATE OR REPLACE FUNCTION public.coupons_notify_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
BEGIN
  target := NEW.assigned_user_id;
  IF target IS NULL AND NEW.assigned_email IS NOT NULL THEN
    SELECT id INTO target FROM public.profiles WHERE lower(email) = lower(NEW.assigned_email) LIMIT 1;
  END IF;
  IF target IS NULL OR NOT NEW.is_active THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, link)
  SELECT target, 'coupon',
         'A coupon was added to your account',
         'Use code ' || NEW.code || ' at checkout to claim your reward.',
         '/account?coupon=' || NEW.code
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = target AND kind = 'coupon' AND link = '/account?coupon=' || NEW.code
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coupons_notify_assignment_trigger ON public.coupons;
CREATE TRIGGER coupons_notify_assignment_trigger
  AFTER INSERT OR UPDATE OF assigned_user_id, assigned_email, is_active ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.coupons_notify_assignment();
