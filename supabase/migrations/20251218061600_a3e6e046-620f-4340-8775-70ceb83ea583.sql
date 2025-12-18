-- Create unique constraint for conflict handling (handles NULL values properly)
ALTER TABLE page_seo_content ADD CONSTRAINT unique_seo_combination 
  UNIQUE NULLS NOT DISTINCT (city, area, category);

-- Function to auto-create SEO entries when products are added
CREATE OR REPLACE FUNCTION auto_create_seo_for_product()
RETURNS TRIGGER AS $$
DECLARE
  category_label TEXT;
  location_str TEXT;
  item_type TEXT;
  default_heading TEXT;
  default_description TEXT;
  default_meta_desc TEXT;
  default_keywords TEXT;
  default_bottom_content TEXT;
BEGIN
  -- Only process published products with city
  IF NEW.status != 'published' OR NEW.city IS NULL OR NEW.city = '' THEN
    RETURN NEW;
  END IF;

  -- Get category label
  category_label := CASE NEW.category
    WHEN 'bridal' THEN 'Bridal Dresses'
    WHEN 'barat' THEN 'Barat Dresses'
    WHEN 'walima' THEN 'Walima Dresses'
    WHEN 'formal' THEN 'Formal Dresses'
    WHEN 'party_wear' THEN 'Party Wear'
    WHEN 'footwear' THEN 'Footwear'
    WHEN 'accessories' THEN 'Accessories'
    WHEN 'jewelry' THEN 'Jewelry'
    WHEN 'bags' THEN 'Bags'
    ELSE 'Dresses'
  END;

  item_type := category_label;

  -- Create City + Category entry (if doesn't exist)
  location_str := 'in ' || NEW.city;
  default_heading := item_type || ' for Rent & Sale ' || location_str;
  default_description := 'Discover stunning ' || lower(item_type) || ' available for rent and sale ' || location_str || '. Browse designer outfits at affordable prices on Behen.pk.';
  default_meta_desc := 'Rent or buy beautiful ' || lower(item_type) || ' ' || location_str || '. Browse designer outfits at affordable prices on Behen.pk.';
  default_keywords := lower(item_type) || ', ' || NEW.city || ', rent dress, buy dress, bridal wear, behen.pk';
  default_bottom_content := '<h2>Why Rent ' || item_type || ' ' || location_str || '?</h2><p>Renting ' || lower(item_type) || ' is the smart choice for modern fashion lovers. At Behen.pk, find designer outfits at a fraction of the purchase price.</p><p>Whether you need a stunning outfit for a wedding, formal event, or special occasion, our collection offers the perfect blend of style and affordability.</p>';

  INSERT INTO page_seo_content (city, area, category, heading, description, meta_description, meta_keywords, bottom_content)
  VALUES (NEW.city, NULL, NEW.category, default_heading, default_description, default_meta_desc, default_keywords, default_bottom_content)
  ON CONFLICT ON CONSTRAINT unique_seo_combination DO NOTHING;

  -- Create City + Area + Category entry (if area exists)
  IF NEW.area IS NOT NULL AND NEW.area != '' THEN
    location_str := 'in ' || NEW.area || ', ' || NEW.city;
    default_heading := item_type || ' for Rent & Sale ' || location_str;
    default_description := 'Discover stunning ' || lower(item_type) || ' available for rent and sale ' || location_str || '. Browse designer outfits at affordable prices on Behen.pk.';
    default_meta_desc := 'Rent or buy beautiful ' || lower(item_type) || ' ' || location_str || '. Browse designer outfits at affordable prices on Behen.pk.';
    default_keywords := lower(item_type) || ', ' || NEW.area || ', ' || NEW.city || ', rent dress, buy dress, behen.pk';
    default_bottom_content := '<h2>Why Rent ' || item_type || ' ' || location_str || '?</h2><p>Renting ' || lower(item_type) || ' is the smart choice for modern fashion lovers in ' || NEW.area || '. At Behen.pk, find designer outfits at a fraction of the purchase price.</p><p>Browse our curated collection of ' || lower(item_type) || ' from trusted Bari Behens in your area.</p>';

    INSERT INTO page_seo_content (city, area, category, heading, description, meta_description, meta_keywords, bottom_content)
    VALUES (NEW.city, NEW.area, NEW.category, default_heading, default_description, default_meta_desc, default_keywords, default_bottom_content)
    ON CONFLICT ON CONSTRAINT unique_seo_combination DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger that fires after product insert
CREATE TRIGGER trigger_auto_create_seo
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_seo_for_product();