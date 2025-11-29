-- Expand product categories to include footwear and accessories
ALTER TABLE public.products DROP CONSTRAINT products_category_check;

ALTER TABLE public.products 
ADD CONSTRAINT products_category_check 
CHECK (category IN ('bridal', 'barat', 'walima', 'formal', 'party_wear', 'footwear', 'accessories', 'jewelry', 'bags', 'fashion_tips'));

-- Add style tips field for fashion/style advice
ALTER TABLE public.products
ADD COLUMN style_tips TEXT;

-- Add product type for better categorization
ALTER TABLE public.products
ADD COLUMN product_type TEXT CHECK (product_type IN ('dress', 'footwear', 'accessories', 'jewelry', 'bags', 'tips')) DEFAULT 'dress';