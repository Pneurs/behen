-- Add owner_response column to reviews table
ALTER TABLE public.reviews 
ADD COLUMN owner_response text,
ADD COLUMN owner_response_at timestamp with time zone;

-- Update RLS policy to allow owners to respond to reviews
CREATE POLICY "Owners can respond to reviews on their products" 
ON public.reviews 
FOR UPDATE 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Allow super_admin to manage all reviews (CRUD)
CREATE POLICY "Super admins can manage all reviews" 
ON public.reviews 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admin to delete reviews
CREATE POLICY "Super admins can delete reviews" 
ON public.reviews 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));