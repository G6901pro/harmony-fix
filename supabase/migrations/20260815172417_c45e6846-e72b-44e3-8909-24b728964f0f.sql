-- Public read tables (browsable catalogue + site content)
GRANT SELECT ON public.products, public.categories, public.collections, public.collection_products,
  public.product_option_groups, public.product_option_values, public.product_variants,
  public.homepage_blocks, public.shipping_zones, public.site_settings, public.reviews TO anon;

-- Authenticated app surface
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.products, public.categories, public.collections, public.collection_products,
  public.product_option_groups, public.product_option_values, public.product_variants,
  public.homepage_blocks, public.shipping_zones, public.site_settings,
  public.reviews, public.orders, public.order_items, public.order_events, public.order_returns,
  public.deliveries, public.invoices, public.addresses, public.payment_methods,
  public.wishlist_items, public.notifications, public.profiles, public.coupons,
  public.media_assets, public.inventory_transactions, public.admin_activity_log,
  public.admin_seen_markers, public.admin_access_grants, public.user_roles
TO authenticated;

GRANT SELECT ON public.admin_allowlist TO authenticated;

-- Service role / system access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
