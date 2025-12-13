-- Allow super admins to update any product
CREATE POLICY "Super admins can update any product" 
ON public.products 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to delete any product
CREATE POLICY "Super admins can delete any product" 
ON public.products 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to view all products (including unpublished)
CREATE POLICY "Super admins can view all products" 
ON public.products 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role));