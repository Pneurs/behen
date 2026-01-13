-- Add video_url column to products table for optional product video links
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN public.products.video_url IS 'Optional external video URL (YouTube, Google Drive, Vimeo) for product showcase';