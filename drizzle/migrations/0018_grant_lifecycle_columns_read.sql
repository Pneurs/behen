GRANT SELECT (listing_active, activated_at, deactivated_at) ON public.products TO anon;
GRANT SELECT (listing_active, activated_at, deactivated_at, product_code) ON public.products TO authenticated;
