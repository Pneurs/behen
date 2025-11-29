-- Fix search_path for rating functions
CREATE OR REPLACE FUNCTION public.get_product_average_rating(product_uuid UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(AVG(product_rating), 0)
  FROM public.reviews
  WHERE product_id = product_uuid
$$;

CREATE OR REPLACE FUNCTION public.get_owner_average_rating(owner_uuid UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(AVG(owner_rating), 0)
  FROM public.reviews
  WHERE owner_id = owner_uuid
$$;