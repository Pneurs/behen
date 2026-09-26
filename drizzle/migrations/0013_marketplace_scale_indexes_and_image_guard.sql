CREATE INDEX IF NOT EXISTS idx_products_status_created ON public.products (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_status_city_created ON public.products (status, city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_status_category_created ON public.products (status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_status_listing_type ON public.products (status, listing_type);
CREATE INDEX IF NOT EXISTS idx_products_owner ON public.products (owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_product_status ON public.bookings (product_id, booking_status);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user ON public.wishlists (user_id);

CREATE OR REPLACE FUNCTION public.reject_inline_product_images()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ai_cover_image LIKE 'data:%'
     OR EXISTS (SELECT 1 FROM unnest(COALESCE(NEW.public_images, '{}'::text[])) u WHERE u LIKE 'data:%')
     OR EXISTS (SELECT 1 FROM unnest(COALESCE(NEW.real_images, '{}'::text[])) u WHERE u LIKE 'data:%') THEN
    RAISE EXCEPTION 'Photos must be uploaded to storage, not saved inline';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reject_inline_product_images ON public.products;
CREATE TRIGGER reject_inline_product_images
BEFORE INSERT OR UPDATE OF ai_cover_image, public_images, real_images ON public.products
FOR EACH ROW EXECUTE FUNCTION public.reject_inline_product_images();