-- Create categories table with self-referencing parent_id for subcategories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read active categories" ON public.categories
FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can read all categories" ON public.categories
FOR SELECT USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert categories" ON public.categories
FOR INSERT WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update categories" ON public.categories
FOR UPDATE USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete categories" ON public.categories
FOR DELETE USING (has_role(auth.uid(), 'super_admin'));

-- Create index for faster parent lookups
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX idx_categories_slug ON public.categories(slug);

-- Seed initial categories
INSERT INTO public.categories (name, slug, parent_id, icon, sort_order) VALUES
('Bridal', 'bridal', NULL, 'Crown', 1),
('Barat', 'barat', NULL, 'Heart', 2),
('Walima', 'walima', NULL, 'Sparkles', 3),
('Formal', 'formal', NULL, 'GraduationCap', 4),
('Party Wear', 'party_wear', NULL, 'PartyPopper', 5),
('Footwear', 'footwear', NULL, 'Footprints', 6),
('Accessories', 'accessories', NULL, 'Gem', 7),
('Jewelry', 'jewelry', NULL, 'Diamond', 8),
('Bags', 'bags', NULL, 'ShoppingBag', 9),
('Fashion Tips', 'fashion_tips', NULL, 'Lightbulb', 10);