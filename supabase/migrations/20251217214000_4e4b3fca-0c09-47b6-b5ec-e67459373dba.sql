-- Add bottom_content column for rich SEO content
ALTER TABLE public.page_seo_content 
ADD COLUMN bottom_content TEXT;