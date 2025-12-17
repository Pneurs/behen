-- Add new columns for pickup/contact details
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS pickup_location TEXT,
ADD COLUMN IF NOT EXISTS dropoff_location TEXT;

-- Add new order stage for sale products
ALTER TYPE order_stage ADD VALUE IF NOT EXISTS 'ready_for_pickup';