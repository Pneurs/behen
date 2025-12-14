-- Create function to get user role by email (for checking existing accounts)
CREATE OR REPLACE FUNCTION public.get_user_role_by_email(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id uuid;
  found_role text;
BEGIN
  -- Get user_id from auth.users
  SELECT id INTO found_user_id FROM auth.users WHERE email = user_email;
  
  IF found_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get role from profiles
  SELECT role INTO found_role FROM public.profiles WHERE user_id = found_user_id;
  
  RETURN found_role;
END;
$$;