CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.protect_phone_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can change phone_verified
  IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
    IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
      NEW.phone_verified := OLD.phone_verified;
    END IF;
  END IF;

  -- Reset verification if phone number changes
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    NEW.phone_verified := false;
    NEW.phone_verification_code := NULL;
    NEW.phone_verification_sent_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_phone_verification
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_phone_verification();