-- Unique human-friendly product code (BP-1001, BP-1002, ...)
CREATE SEQUENCE IF NOT EXISTS public.product_code_seq START WITH 1001 INCREMENT BY 1;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_code TEXT;

-- Backfill existing listings in creation order
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn
  FROM public.products
  WHERE product_code IS NULL
)
UPDATE public.products p
SET product_code = 'BP-' || (1000 + o.rn)::text
FROM ordered o
WHERE p.id = o.id;

-- Move the sequence past the backfilled codes
SELECT setval('public.product_code_seq', GREATEST(1001, (SELECT COALESCE(COUNT(*), 0) + 1001 FROM public.products)), false);

CREATE UNIQUE INDEX IF NOT EXISTS products_product_code_key ON public.products (product_code);

CREATE OR REPLACE FUNCTION public.assign_product_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_code IS NULL OR NEW.product_code = '' THEN
    NEW.product_code := 'BP-' || nextval('public.product_code_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_product_code ON public.products;
CREATE TRIGGER trg_assign_product_code
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.assign_product_code();
