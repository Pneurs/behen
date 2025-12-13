-- Update the handle_new_user function to also create user_earnings record with referred_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'choti')
  );
  
  -- Create user_earnings record if user was referred (for Bari Behens)
  IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
    INSERT INTO public.user_earnings (user_id, referred_by, balance, pending_balance)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'referred_by')::uuid,
      0,
      0
    );
  END IF;
  
  RETURN NEW;
END;
$$;