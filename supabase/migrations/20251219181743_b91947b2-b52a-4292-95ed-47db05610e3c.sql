-- Add new columns to products table for rental instructions
ALTER TABLE products ADD COLUMN IF NOT EXISTS dry_cleaned BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS alterations_allowed BOOLEAN DEFAULT false;

-- Add new columns to bookings table for checklist and opening video
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS opening_video_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS opening_video_uploaded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS packing_checklist_completed BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stickers_downloaded BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS instruction_page_downloaded BOOLEAN DEFAULT false;

-- Add new order stage value for opening video
ALTER TYPE order_stage ADD VALUE IF NOT EXISTS 'pending_opening_video' AFTER 'pending_pickup';