REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (
  id, title, category, subcategory, condition, listing_type,
  rental_price_per_day, sale_price, security_deposit, description,
  fabric, color, work_type, designer, size, height_range, weight_range,
  chest_size, waist_size, hips_size, alteration_possible, last_rented_on,
  times_rented, city, area, ai_cover_image, status, availability_data,
  created_at, updated_at, style_tips, product_type, rental_price_4days,
  extra_day_rate, original_price, dry_clean_only, included_accessories,
  ai_generation_attempts, image_quality_validated, inventory_status,
  dry_cleaned, alterations_allowed, negotiation_allowed, public_images,
  owner_id
) ON public.products TO anon;

CREATE OR REPLACE FUNCTION public.get_public_product(_product_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(p)
    - 'private_image_paths'
    - 'uploaded_video_path'
    - 'real_images'
    - 'video_url'
    - 'contact_phone'
    - 'pickup_location'
    - 'dropoff_location'
    - 'latitude'
    - 'longitude'
  FROM public.products p
  WHERE p.id = _product_id AND p.status = 'published'
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_product(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_product(uuid) TO anon, authenticated, service_role;