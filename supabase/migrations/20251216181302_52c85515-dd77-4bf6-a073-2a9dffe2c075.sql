-- Create app_settings table for platform-wide configuration
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Insert default AI model setting (Lovable AI as default for cost efficiency)
INSERT INTO public.app_settings (key, value) 
VALUES ('ai_image_model', '{"provider": "lovable", "model": "google/gemini-2.5-flash-image-preview"}');

-- RLS Policies
-- Everyone can read settings
CREATE POLICY "Anyone can read app settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Only super_admin can update settings
CREATE POLICY "Super admins can update settings"
ON public.app_settings
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can insert settings
CREATE POLICY "Super admins can insert settings"
ON public.app_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Only super_admin can delete settings
CREATE POLICY "Super admins can delete settings"
ON public.app_settings
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));