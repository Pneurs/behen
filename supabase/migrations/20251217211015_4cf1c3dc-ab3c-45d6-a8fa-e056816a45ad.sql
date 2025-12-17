-- Create page_seo_content table for managing SEO content on browse pages
CREATE TABLE public.page_seo_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city TEXT,
    area TEXT,
    category TEXT,
    heading TEXT NOT NULL,
    description TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    UNIQUE(city, area, category)
);

-- Enable RLS
ALTER TABLE public.page_seo_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read SEO content (needed for public pages)
CREATE POLICY "Anyone can read SEO content"
ON public.page_seo_content
FOR SELECT
USING (true);

-- Only super_admin can insert
CREATE POLICY "Super admins can insert SEO content"
ON public.page_seo_content
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Only super_admin can update
CREATE POLICY "Super admins can update SEO content"
ON public.page_seo_content
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

-- Only super_admin can delete
CREATE POLICY "Super admins can delete SEO content"
ON public.page_seo_content
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_page_seo_content_updated_at
BEFORE UPDATE ON public.page_seo_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();