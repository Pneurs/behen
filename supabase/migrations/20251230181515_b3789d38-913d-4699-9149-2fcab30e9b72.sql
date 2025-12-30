-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding-assets', 'branding-assets', true);

-- RLS policies for super_admin only uploads
CREATE POLICY "Super admins can upload branding assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding-assets' AND 
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Anyone can view branding assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'branding-assets');

CREATE POLICY "Super admins can update branding assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding-assets' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete branding assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding-assets' AND public.has_role(auth.uid(), 'super_admin'));