-- 1. Listing lifecycle: 15-day timeline
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS activated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS listing_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

UPDATE public.products
SET activated_at = COALESCE(activated_at, created_at),
    listing_active = COALESCE(listing_active, true);

CREATE INDEX IF NOT EXISTS idx_products_listing_active
  ON public.products (listing_active, status, created_at DESC);

-- Seller reactivation (free), resets the 15-day clock
CREATE OR REPLACE FUNCTION public.reactivate_listing(_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT owner_id INTO v_owner FROM public.products WHERE id = _product_id;
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_uid <> v_owner
     AND NOT public.has_role(v_uid, 'admin')
     AND NOT public.has_role(v_uid, 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authorized');
  END IF;

  UPDATE public.products
  SET listing_active = true,
      activated_at = now(),
      deactivated_at = NULL,
      inventory_status = CASE WHEN inventory_status = 'unavailable' THEN 'available' ELSE inventory_status END
  WHERE id = _product_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Admin / owner toggle active state
CREATE OR REPLACE FUNCTION public.set_listing_active(_product_id uuid, _active boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT owner_id INTO v_owner FROM public.products WHERE id = _product_id;
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;

  IF v_uid <> v_owner
     AND NOT public.has_role(v_uid, 'admin')
     AND NOT public.has_role(v_uid, 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authorized');
  END IF;

  UPDATE public.products
  SET listing_active = _active,
      activated_at = CASE WHEN _active THEN now() ELSE activated_at END,
      deactivated_at = CASE WHEN _active THEN NULL ELSE now() END
  WHERE id = _product_id;

  RETURN jsonb_build_object('success', true, 'listing_active', _active);
END;
$$;

-- Daily expiry sweep
CREATE OR REPLACE FUNCTION public.expire_stale_listings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _days integer;
  _count integer := 0;
BEGIN
  SELECT COALESCE((value->>'days')::integer, 15) INTO _days
  FROM public.app_settings WHERE key = 'listing_active_days';
  _days := COALESCE(_days, 15);

  WITH expired AS (
    UPDATE public.products
    SET listing_active = false,
        deactivated_at = now()
    WHERE listing_active = true
      AND COALESCE(activated_at, created_at) < now() - (_days || ' days')::interval
    RETURNING owner_id, id, title
  ), notified AS (
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT owner_id, 'listing_expired', 'Listing paused after ' || _days || ' days',
           '"' || title || '" is paused. Tell us if it is sold, or reactivate it free from your dashboard.',
           '/bari-behen-dashboard'
    FROM expired
    RETURNING 1
  )
  SELECT count(*) INTO _count FROM expired;

  RETURN _count;
END;
$$;

-- 2. Social follow reward (one-time, 3 credits)
CREATE TABLE IF NOT EXISTS public.social_follow_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  credits_awarded integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.social_follow_claims TO authenticated;
GRANT ALL ON public.social_follow_claims TO service_role;

ALTER TABLE public.social_follow_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own social claim"
ON public.social_follow_claims FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.claim_social_follow_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_credits integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.social_follow_claims WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  SELECT COALESCE((value->>'credits')::integer, 3) INTO v_credits
  FROM public.app_settings WHERE key = 'social_follow_reward';
  v_credits := COALESCE(v_credits, 3);

  INSERT INTO public.social_follow_claims (user_id, credits_awarded)
  VALUES (v_uid, v_credits);

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (v_uid, v_credits)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.user_credits.balance + v_credits, updated_at = now();

  INSERT INTO public.credit_transactions (user_id, amount, type, notes)
  VALUES (v_uid, v_credits, 'social_follow', 'Followed Behen.pk on Instagram & TikTok');

  RETURN jsonb_build_object('success', true, 'credits', v_credits);
END;
$$;
