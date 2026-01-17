-- Allow new hierarchical (gender-prefixed) category strings
-- The current products_category_check only allows legacy flat values and blocks inserts like `women_barat`.

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_category_check;

-- Keep a minimal guard that category isn't an empty string
ALTER TABLE public.products
  ADD CONSTRAINT products_category_not_empty_check
  CHECK (char_length(category) > 0);