-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  product_rating INTEGER NOT NULL CHECK (product_rating >= 1 AND product_rating <= 5),
  owner_rating INTEGER NOT NULL CHECK (owner_rating >= 1 AND owner_rating <= 5),
  product_review TEXT,
  owner_review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Renters can create reviews for completed bookings"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id 
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id
      AND renter_id = auth.uid()
      AND booking_status = 'completed'
    )
  );

CREATE POLICY "Reviewers can update their own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);

-- Create trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate average ratings for products
CREATE OR REPLACE FUNCTION public.get_product_average_rating(product_uuid UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(AVG(product_rating), 0)
  FROM public.reviews
  WHERE product_id = product_uuid
$$;

-- Create function to calculate average ratings for owners
CREATE OR REPLACE FUNCTION public.get_owner_average_rating(owner_uuid UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(AVG(owner_rating), 0)
  FROM public.reviews
  WHERE owner_id = owner_uuid
$$;

-- Add indexes for better performance
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_reviews_owner_id ON public.reviews(owner_id);
CREATE INDEX idx_reviews_booking_id ON public.reviews(booking_id);