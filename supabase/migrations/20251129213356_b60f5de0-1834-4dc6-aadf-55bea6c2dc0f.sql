-- Add new pricing fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS rental_price_4days numeric,
ADD COLUMN IF NOT EXISTS extra_day_rate numeric,
ADD COLUMN IF NOT EXISTS original_price numeric;

COMMENT ON COLUMN public.products.rental_price_4days IS 'Minimum 4-day rental price';
COMMENT ON COLUMN public.products.extra_day_rate IS 'Price per day after initial 4 days';
COMMENT ON COLUMN public.products.original_price IS 'Original/retail price before discount for showing percentage off';