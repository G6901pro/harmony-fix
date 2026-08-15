CREATE POLICY "product media read" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'product-media');
CREATE POLICY "product media admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-media' AND public.is_admin(auth.uid()));
CREATE POLICY "product media admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-media' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'product-media' AND public.is_admin(auth.uid()));
CREATE POLICY "product media admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-media' AND public.is_admin(auth.uid()));
