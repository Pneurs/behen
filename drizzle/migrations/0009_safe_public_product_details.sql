CREATE OR REPLACE FUNCTION public.get_public_product(_product_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT to_jsonb(p)
    - 'private_image_paths'
    - 'uploaded_video_path'
    - 'real_images'
    - 'contact_phone'
    - 'pickup_location'
    - 'dropoff_location'
    - 'latitude'
    - 'longitude'
  FROM public.products p
  WHERE p.id = _product_id AND p.status = 'published'
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_product(uuid) TO anon, authenticated, service_role;