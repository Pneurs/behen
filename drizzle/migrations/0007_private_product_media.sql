ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS public_images text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS private_image_paths text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS uploaded_video_path text;

UPDATE public.products
SET public_images = CASE
  WHEN ai_cover_image IS NOT NULL AND ai_cover_image <> '' THEN ARRAY[ai_cover_image]
  WHEN real_images IS NOT NULL THEN real_images[1:3]
  ELSE '{}'::text[]
END
WHERE public_images IS NULL OR cardinality(public_images) = 0;

ALTER TABLE public.products
  ADD CONSTRAINT products_public_images_limit CHECK (cardinality(public_images) <= 3) NOT VALID,
  ADD CONSTRAINT products_private_images_limit CHECK (cardinality(private_image_paths) <= 6) NOT VALID;

COMMENT ON COLUMN public.products.public_images IS 'Public listing photos visible to anonymous visitors; maximum 3.';
COMMENT ON COLUMN public.products.private_image_paths IS 'Object paths in private product-private-media storage; maximum 6.';
COMMENT ON COLUMN public.products.uploaded_video_path IS 'Object path for an uploaded listing video in private product-private-media storage.';

CREATE POLICY "Authenticated users upload private product media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-private-media'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

CREATE POLICY "Owners read private product media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'product-private-media'
  AND (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    OR public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'super_admin')
  )
);

CREATE POLICY "Owners update private product media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-private-media'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'product-private-media'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

CREATE POLICY "Owners delete private product media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-private-media'
  AND (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    OR public.has_role((select auth.uid()), 'admin')
    OR public.has_role((select auth.uid()), 'super_admin')
  )
);