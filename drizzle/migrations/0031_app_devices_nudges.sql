CREATE TABLE public.app_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_nudge_at timestamptz,
  nudge_count int NOT NULL DEFAULT 0
);
GRANT ALL ON public.app_devices TO service_role;
ALTER TABLE public.app_devices ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.register_app_device(_token text, _platform text DEFAULT 'android')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _token IS NULL OR length(_token) < 20 OR length(_token) > 500 THEN RETURN; END IF;
  INSERT INTO public.app_devices(token, platform, user_id)
  VALUES (_token, left(coalesce(_platform,'android'),20), auth.uid())
  ON CONFLICT (token) DO UPDATE
    SET last_seen_at = now(),
        user_id = coalesce(auth.uid(), public.app_devices.user_id);
END $$;
REVOKE ALL ON FUNCTION public.register_app_device(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.register_app_device(text, text) TO anon, authenticated;