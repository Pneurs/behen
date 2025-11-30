-- Add inventory_status column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS inventory_status TEXT NOT NULL DEFAULT 'available';

-- Add comment to explain the field
COMMENT ON COLUMN public.products.inventory_status IS 'Product availability: available, rented, or unavailable';

-- Create wishlist table
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on wishlist table
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- Create policies for wishlist
CREATE POLICY "Users can view their own wishlist"
ON public.wishlists
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own wishlist"
ON public.wishlists
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own wishlist"
ON public.wishlists
FOR DELETE
USING (auth.uid() = user_id);

-- Add foreign key for wishlist product_id
ALTER TABLE public.wishlists
ADD CONSTRAINT wishlists_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE CASCADE;