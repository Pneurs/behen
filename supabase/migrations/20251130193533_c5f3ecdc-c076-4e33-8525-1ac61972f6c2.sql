-- Ensure user_roles table exists with proper structure
-- (This might already exist, but this ensures it's set up correctly)

-- Insert admin role for the specified email
-- Note: This will only work after the user signs up with this email
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user_id for the admin email (if they've signed up)
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'ghunvatazeen@gmail.com';
  
  -- If user exists, add super_admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'super_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;