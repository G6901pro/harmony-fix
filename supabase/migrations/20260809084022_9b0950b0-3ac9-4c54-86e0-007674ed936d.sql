create extension if not exists pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.option_value_status AS ENUM ('active', 'hidden', 'out_of_stock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'order_pending', 'pending_payment', 'payment_under_review', 'payment_approved',
    'order_confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery',
    'delivered', 'cancelled', 'returned'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email text PRIMARY KEY,
  role public.app_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  revoked boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text,
  entity_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Home',
  recipient text NOT NULL,
  phone text,
  line1 text NOT NULL,
  line2 text,
  area text,
  city text NOT NULL,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'Bangladesh',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collection_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, product_slug)
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'uncategorized',
  brand text,
  color text,
  age_group text,
  sku text,
  barcode text,
  base_price numeric NOT NULL DEFAULT 0,
  compare_at_price numeric,
  main_image text,
  gallery_images text[] NOT NULL DEFAULT '{}',
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  stock_status text NOT NULL DEFAULT 'in_stock',
  status text NOT NULL DEFAULT 'draft',
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  is_new_arrival boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  name text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_adjustment numeric NOT NULL DEFAULT 0,
  sku text,
  stock integer NOT NULL DEFAULT 0,
  status public.option_value_status NOT NULL DEFAULT 'active',
  images text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  combination jsonb NOT NULL DEFAULT '{}'::jsonb,
  label text,
  sku text,
  price numeric,
  stock integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  images text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_number text UNIQUE,
  status public.order_status NOT NULL DEFAULT 'order_pending',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  shipping numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  coupon_code text,
  shipping_address jsonb,
  payment_method text,
  payment_provider text,
  payment_txn_id text,
  payment_note text,
  payment_screenshot text,
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_verified boolean NOT NULL DEFAULT false,
  payment_reviewed_at timestamptz,
  payment_reviewed_by uuid,
  payment_rejection_reason text,
  tracking_number text,
  courier text,
  estimated_delivery timestamptz,
  delivered_at timestamptz,
  placed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  product_name text NOT NULL,
  image_url text,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  selected_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  return_number text NOT NULL UNIQUE,
  reason text,
  note text,
  status text NOT NULL DEFAULT 'requested',
  refund_amount numeric NOT NULL DEFAULT 0,
  restock boolean NOT NULL DEFAULT false,
  restocked boolean NOT NULL DEFAULT false,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_status text NOT NULL DEFAULT 'pending',
  courier text,
  tracking_number text,
  recipient_name text,
  recipient_phone text,
  address_summary text,
  note text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  product_name text,
  variant_label text,
  option_value_id uuid,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid,
  quantity_delta integer NOT NULL,
  reason text NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL DEFAULT 5,
  title text,
  body text,
  images text[] NOT NULL DEFAULT '{}',
  author_name text,
  is_verified_purchase boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  admin_reply text,
  replied_at timestamptz,
  moderated_at timestamptz,
  moderated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_total numeric NOT NULL DEFAULT 0,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  expires_at timestamptz,
  terms text,
  assigned_email text,
  assigned_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug)
);

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'card',
  label text NOT NULL,
  brand text,
  last4 text,
  exp_month integer,
  exp_year integer,
  holder_name text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  path text,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.homepage_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'banner',
  title text NOT NULL,
  subtitle text,
  body text,
  image text,
  link_url text,
  link_label text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  areas text NOT NULL DEFAULT '',
  delivery_charge numeric NOT NULL DEFAULT 0,
  estimated_days text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  logo_url text,
  favicon_url text,
  loading_logo_url text,
  seo_title text,
  seo_description text,
  seo_keywords text,
  contact_email text,
  contact_phone text,
  contact_address text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  payment_numbers jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_delivery_charge numeric NOT NULL DEFAULT 60,
  inside_dhaka_delivery_charge numeric NOT NULL DEFAULT 60,
  outside_dhaka_delivery_charge numeric NOT NULL DEFAULT 120,
  free_shipping_threshold numeric NOT NULL DEFAULT 0,
  maintenance_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (singleton)
);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','user_roles','admin_allowlist','admin_access_grants','admin_activity_log',
    'addresses','categories','collections','collection_products','products',
    'product_option_groups','product_option_values','product_variants',
    'orders','order_items','order_events','order_returns','deliveries','invoices',
    'inventory_transactions','reviews','coupons','wishlist_items','payment_methods',
    'notifications','media_assets','homepage_blocks','shipping_zones','site_settings'
  ])
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.collections TO anon;
GRANT SELECT ON public.collection_products TO anon;
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT ON public.product_option_groups TO anon;
GRANT SELECT ON public.product_option_values TO anon;
GRANT SELECT ON public.homepage_blocks TO anon;
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.shipping_zones TO anon;
GRANT SELECT ON public.reviews TO anon;
