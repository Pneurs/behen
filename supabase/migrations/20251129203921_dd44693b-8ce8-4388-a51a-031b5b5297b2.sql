-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic details
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bridal', 'barat', 'walima', 'formal', 'party_wear')),
  subcategory TEXT,
  condition TEXT NOT NULL CHECK (condition IN ('new', 'like_new', 'used_twice', 'used_often')),
  listing_type TEXT NOT NULL CHECK (listing_type IN ('rent', 'sale', 'both')),
  
  -- Pricing
  rental_price_per_day DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  security_deposit DECIMAL(10,2),
  
  -- Description
  description TEXT,
  fabric TEXT,
  color TEXT,
  work_type TEXT,
  designer TEXT,
  
  -- Size & Fit
  size TEXT,
  height_range TEXT,
  weight_range TEXT,
  chest_size TEXT,
  waist_size TEXT,
  hips_size TEXT,
  alteration_possible BOOLEAN DEFAULT false,
  
  -- Rental History
  last_rented_on TIMESTAMPTZ,
  times_rented INTEGER DEFAULT 0,
  
  -- Location (approximate for privacy)
  city TEXT,
  area TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- Images (URLs to storage)
  ai_cover_image TEXT,
  real_images TEXT[], -- Array of storage URLs
  
  -- Status
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'rented', 'sold', 'archived')),
  
  -- Availability (JSONB for flexible calendar data)
  availability_data JSONB DEFAULT '{"blackout_dates": [], "available_dates": []}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policies for products
CREATE POLICY "Anyone can view published products"
  ON public.products
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "Owners can view their own products"
  ON public.products
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create products"
  ON public.products
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own products"
  ON public.products
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own products"
  ON public.products
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own product images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'product-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own product images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'product-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create index for faster location-based queries
CREATE INDEX idx_products_location ON public.products(latitude, longitude) WHERE status = 'published';
CREATE INDEX idx_products_category ON public.products(category) WHERE status = 'published';
CREATE INDEX idx_products_owner ON public.products(owner_id);