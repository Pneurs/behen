ALTER POLICY "Owners read private product media"
ON storage.objects
USING (
  bucket_id = 'product-private-media'
  AND (
    (storage.foldername(name))[2] = 'images'
    OR (storage.foldername(name))[1] = (select auth.uid()::text)
    OR public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'super_admin')
  )
);

ALTER TABLE public.products
  ADD CONSTRAINT products_new_listing_video_required CHECK (
    created_at < '2026-09-23T00:00:00Z'::timestamptz
    OR NULLIF(btrim(video_url), '') IS NOT NULL
    OR NULLIF(btrim(uploaded_video_path), '') IS NOT NULL
  ) NOT VALID;