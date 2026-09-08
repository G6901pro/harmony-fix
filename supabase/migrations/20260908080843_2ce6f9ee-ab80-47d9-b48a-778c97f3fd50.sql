ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS box_contents text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS color_options text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS warranty text,
  ADD COLUMN IF NOT EXISTS safety_info text;