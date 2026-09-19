-- Allow the verification helper function to set phone_verified
CREATE OR REPLACE FUNCTION public.protect_phone_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
    IF NOT (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR coalesce(current_setting('app.phone_verify_ok', true), '') = 'on'
    ) THEN
      NEW.phone_verified := OLD.phone_verified;
    END IF;
  END IF;

  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    NEW.phone_verified := false;
    NEW.phone_verification_code := NULL;
    NEW.phone_verification_sent_at := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- Returns the caller's verification code, but only when the correct link token is supplied.
-- Generates a name-based code (e.g. tazeen_A987) on first request.
CREATE OR REPLACE FUNCTION public.get_my_verification_code(_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_expected text;
  v_code text;
  v_name text;
  v_base text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT value->>'token' INTO v_expected
  FROM public.app_settings
  WHERE key = 'whatsapp_verify_link_token';

  IF v_expected IS NULL OR v_expected = '' OR _token IS DISTINCT FROM v_expected THEN
    RETURN NULL;
  END IF;

  SELECT phone_verification_code, name INTO v_code, v_name
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF v_code IS NOT NULL AND v_code <> '' THEN
    RETURN v_code;
  END IF;

  v_base := lower(regexp_replace(split_part(coalesce(v_name, 'behen'), ' ', 1), '[^a-zA-Z0-9]', '', 'g'));
  IF v_base = '' THEN v_base := 'behen'; END IF;

  v_code := v_base || '_' || upper(substr(md5(random()::text || auth.uid()::text), 1, 4));

  UPDATE public.profiles
  SET phone_verification_code = v_code,
      phone_verification_sent_at = now()
  WHERE user_id = auth.uid();

  RETURN v_code;
END;
$function$;

-- Verifies the caller's phone when the submitted code matches
CREATE OR REPLACE FUNCTION public.verify_phone_with_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_expected text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT phone_verification_code INTO v_expected
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF v_expected IS NULL OR v_expected = '' THEN
    RETURN false;
  END IF;

  IF upper(btrim(_code)) <> upper(v_expected) THEN
    RETURN false;
  END IF;

  PERFORM set_config('app.phone_verify_ok', 'on', true);

  UPDATE public.profiles
  SET phone_verified = true,
      phone_verification_code = NULL,
      phone_verification_sent_at = NULL
  WHERE user_id = auth.uid();

  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_verification_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_phone_with_code(text) TO authenticated;