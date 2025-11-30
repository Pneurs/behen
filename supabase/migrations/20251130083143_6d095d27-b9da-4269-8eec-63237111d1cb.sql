-- Add new required fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS dry_clean_only boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS included_accessories jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_generation_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_quality_validated boolean DEFAULT false;

-- Make location fields NOT NULL (with default empty string for existing records)
UPDATE products SET city = '' WHERE city IS NULL;
UPDATE products SET area = '' WHERE area IS NULL;
ALTER TABLE products ALTER COLUMN city SET NOT NULL;
ALTER TABLE products ALTER COLUMN city SET DEFAULT '';
ALTER TABLE products ALTER COLUMN area SET NOT NULL;
ALTER TABLE products ALTER COLUMN area SET DEFAULT '';

-- Make size and fit fields NOT NULL where applicable
UPDATE products SET size = '' WHERE size IS NULL;
ALTER TABLE products ALTER COLUMN size SET NOT NULL;
ALTER TABLE products ALTER COLUMN size SET DEFAULT '';

-- Add comment for clarity
COMMENT ON COLUMN products.dry_clean_only IS 'Whether the product requires dry cleaning only';
COMMENT ON COLUMN products.included_accessories IS 'JSON array of included accessories like jewelry, footwear, etc';
COMMENT ON COLUMN products.ai_generation_attempts IS 'Number of times AI mannequin was regenerated';
COMMENT ON COLUMN products.image_quality_validated IS 'Whether uploaded images passed quality checks';