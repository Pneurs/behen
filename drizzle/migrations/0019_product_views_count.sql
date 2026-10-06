ALTER TABLE public.products ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;
GRANT SELECT (views_count) ON public.products TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.increment_product_views(_product_id uuid)
RETURNS integer LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.products SET views_count = views_count + 1
  WHERE id = _product_id AND status = 'published'
  RETURNING views_count;
$$;
REVOKE ALL ON FUNCTION public.increment_product_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_product_views(uuid) TO anon, authenticated;