-- product-media: admin manage, authenticated read
DROP POLICY IF EXISTS "product_media_admin_all" ON storage.objects;
CREATE POLICY "product_media_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'product-media' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'product-media' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "product_media_read" ON storage.objects;
CREATE POLICY "product_media_read" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'product-media');

-- payment-receipts: owner writes/reads own folder, admins read all
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