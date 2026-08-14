DROP POLICY IF EXISTS "profiles select own or admin" ON public.profiles;
CREATE POLICY "profiles select own or admin" ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "profiles update own or admin" ON public.profiles;
CREATE POLICY "profiles update own or admin" ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "profiles insert own or admin" ON public.profiles;
CREATE POLICY "profiles insert own or admin" ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "profiles delete admin" ON public.profiles;
CREATE POLICY "profiles delete admin" ON public.profiles FOR DELETE
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "user_roles select own or admin" ON public.user_roles;
CREATE POLICY "user_roles select own or admin" ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "user_roles admin manage" ON public.user_roles;
CREATE POLICY "user_roles admin manage" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "admin_allowlist admin only" ON public.admin_allowlist;
CREATE POLICY "admin_allowlist admin only" ON public.admin_allowlist FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_allowlist self check" ON public.admin_allowlist;
CREATE POLICY "admin_allowlist self check" ON public.admin_allowlist FOR SELECT
  USING (lower(email) = lower(COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), '')));

DROP POLICY IF EXISTS "admin_access_grants own or admin" ON public.admin_access_grants;
CREATE POLICY "admin_access_grants own or admin" ON public.admin_access_grants FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_access_grants own insert" ON public.admin_access_grants;
CREATE POLICY "admin_access_grants own insert" ON public.admin_access_grants FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_access_grants admin manage" ON public.admin_access_grants;
CREATE POLICY "admin_access_grants admin manage" ON public.admin_access_grants FOR UPDATE
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "admin_activity_log admin only" ON public.admin_activity_log;
CREATE POLICY "admin_activity_log admin only" ON public.admin_activity_log FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "addresses own or admin" ON public.addresses;
CREATE POLICY "addresses own or admin" ON public.addresses FOR ALL
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "categories public read" ON public.categories;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "categories admin write" ON public.categories;
CREATE POLICY "categories admin write" ON public.categories FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "collections public read" ON public.collections;
CREATE POLICY "collections public read" ON public.collections FOR SELECT USING (true);
DROP POLICY IF EXISTS "collections admin write" ON public.collections;
CREATE POLICY "collections admin write" ON public.collections FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "collection_products public read" ON public.collection_products;
CREATE POLICY "collection_products public read" ON public.collection_products FOR SELECT USING (true);
DROP POLICY IF EXISTS "collection_products admin write" ON public.collection_products;
CREATE POLICY "collection_products admin write" ON public.collection_products FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "products public read" ON public.products;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "products admin write" ON public.products;
CREATE POLICY "products admin write" ON public.products FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "product_option_groups public read" ON public.product_option_groups;
CREATE POLICY "product_option_groups public read" ON public.product_option_groups FOR SELECT USING (true);
DROP POLICY IF EXISTS "product_option_groups admin write" ON public.product_option_groups;
CREATE POLICY "product_option_groups admin write" ON public.product_option_groups FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "product_option_values public read" ON public.product_option_values;
CREATE POLICY "product_option_values public read" ON public.product_option_values FOR SELECT USING (true);
DROP POLICY IF EXISTS "product_option_values admin write" ON public.product_option_values;
CREATE POLICY "product_option_values admin write" ON public.product_option_values FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "product_variants public read" ON public.product_variants;
CREATE POLICY "product_variants public read" ON public.product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "product_variants admin write" ON public.product_variants;
CREATE POLICY "product_variants admin write" ON public.product_variants FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "orders select own or admin" ON public.orders;
CREATE POLICY "orders select own or admin" ON public.orders FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "orders insert own" ON public.orders;
CREATE POLICY "orders insert own" ON public.orders FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "orders update own or admin" ON public.orders;
CREATE POLICY "orders update own or admin" ON public.orders FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "orders delete admin" ON public.orders;
CREATE POLICY "orders delete admin" ON public.orders FOR DELETE
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "order_items select own or admin" ON public.order_items;
CREATE POLICY "order_items select own or admin" ON public.order_items FOR SELECT
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
DROP POLICY IF EXISTS "order_items insert own or admin" ON public.order_items;
CREATE POLICY "order_items insert own or admin" ON public.order_items FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
DROP POLICY IF EXISTS "order_items admin write" ON public.order_items;
CREATE POLICY "order_items admin write" ON public.order_items FOR UPDATE
  USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "order_items admin delete" ON public.order_items;
CREATE POLICY "order_items admin delete" ON public.order_items FOR DELETE
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "order_events select own or admin" ON public.order_events;
CREATE POLICY "order_events select own or admin" ON public.order_events FOR SELECT
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
DROP POLICY IF EXISTS "order_events admin write" ON public.order_events;
CREATE POLICY "order_events admin write" ON public.order_events FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "order_returns own or admin select" ON public.order_returns;
CREATE POLICY "order_returns own or admin select" ON public.order_returns FOR SELECT
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
DROP POLICY IF EXISTS "order_returns own insert" ON public.order_returns;
CREATE POLICY "order_returns own insert" ON public.order_returns FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
DROP POLICY IF EXISTS "order_returns admin update" ON public.order_returns;
CREATE POLICY "order_returns admin update" ON public.order_returns FOR UPDATE
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "deliveries own or admin select" ON public.deliveries;
CREATE POLICY "deliveries own or admin select" ON public.deliveries FOR SELECT
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
DROP POLICY IF EXISTS "deliveries admin write" ON public.deliveries;
CREATE POLICY "deliveries admin write" ON public.deliveries FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "invoices own or admin select" ON public.invoices;
CREATE POLICY "invoices own or admin select" ON public.invoices FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "invoices admin write" ON public.invoices;
CREATE POLICY "invoices admin write" ON public.invoices FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "inventory_transactions admin only" ON public.inventory_transactions;
CREATE POLICY "inventory_transactions admin only" ON public.inventory_transactions FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "reviews public read approved" ON public.reviews;
CREATE POLICY "reviews public read approved" ON public.reviews FOR SELECT
  USING (is_approved = true OR user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "reviews own insert" ON public.reviews;
CREATE POLICY "reviews own insert" ON public.reviews FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "reviews own or admin update" ON public.reviews;
CREATE POLICY "reviews own or admin update" ON public.reviews FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "reviews own or admin delete" ON public.reviews;
CREATE POLICY "reviews own or admin delete" ON public.reviews FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "coupons admin manage" ON public.coupons;
CREATE POLICY "coupons admin manage" ON public.coupons FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "coupons assigned user read" ON public.coupons;
CREATE POLICY "coupons assigned user read" ON public.coupons FOR SELECT
  USING (assigned_user_id = auth.uid());
DROP POLICY IF EXISTS "read active public coupons" ON public.coupons;
CREATE POLICY "read active public coupons" ON public.coupons FOR SELECT TO authenticated
  USING (assigned_user_id IS NULL AND is_active = true);

DROP POLICY IF EXISTS "wishlist_items own" ON public.wishlist_items;
CREATE POLICY "wishlist_items own" ON public.wishlist_items FOR ALL
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "payment_methods own" ON public.payment_methods;
CREATE POLICY "payment_methods own" ON public.payment_methods FOR ALL
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "notifications own select" ON public.notifications;
CREATE POLICY "notifications own select" ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "notifications own update" ON public.notifications;
CREATE POLICY "notifications own update" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "notifications admin insert" ON public.notifications;
CREATE POLICY "notifications admin insert" ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) OR user_id = auth.uid());
DROP POLICY IF EXISTS "notifications own delete" ON public.notifications;
CREATE POLICY "notifications own delete" ON public.notifications FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "media_assets admin only" ON public.media_assets;
CREATE POLICY "media_assets admin only" ON public.media_assets FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "homepage_blocks public read" ON public.homepage_blocks;
CREATE POLICY "homepage_blocks public read" ON public.homepage_blocks FOR SELECT USING (true);
DROP POLICY IF EXISTS "homepage_blocks admin write" ON public.homepage_blocks;
CREATE POLICY "homepage_blocks admin write" ON public.homepage_blocks FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "shipping_zones public read" ON public.shipping_zones;
CREATE POLICY "shipping_zones public read" ON public.shipping_zones FOR SELECT USING (true);
DROP POLICY IF EXISTS "shipping_zones admin write" ON public.shipping_zones;
CREATE POLICY "shipping_zones admin write" ON public.shipping_zones FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "site_settings public read" ON public.site_settings;
CREATE POLICY "site_settings public read" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "site_settings admin write" ON public.site_settings;
CREATE POLICY "site_settings admin write" ON public.site_settings FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_verified_admin_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.account_is_active(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_bd_phone(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_delivered_purchase(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_order_stock_movement(uuid, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_my_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_stale_unpaid_orders() TO service_role;
GRANT EXECUTE ON FUNCTION public.preview_coupon(text, numeric) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.consume_coupon(text, uuid) TO authenticated, service_role;

INSERT INTO public.site_settings (singleton) SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);

INSERT INTO public.admin_allowlist (email, role)
SELECT 'arabikabir302@gmail.com', 'super_admin'::public.app_role
WHERE NOT EXISTS (SELECT 1 FROM public.admin_allowlist WHERE lower(email) = 'arabikabir302@gmail.com');