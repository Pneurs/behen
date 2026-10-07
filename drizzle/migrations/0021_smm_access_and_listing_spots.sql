CREATE OR REPLACE FUNCTION public.is_payment_reviewer(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'admin') OR public.has_role(_uid,'super_admin') OR public.has_role(_uid,'social_media_manager')
$$;

ALTER TABLE public.credit_purchases ADD COLUMN IF NOT EXISTS purchase_type text NOT NULL DEFAULT 'credits';

CREATE TABLE IF NOT EXISTS public.listing_spots (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listing_spots TO authenticated;
GRANT ALL ON public.listing_spots TO service_role;
ALTER TABLE public.listing_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own spots" ON public.listing_spots FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_payment_reviewer(auth.uid()));

CREATE POLICY "SMM can view all purchases" ON public.credit_purchases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'social_media_manager'));
CREATE POLICY "SMM can update purchases" ON public.credit_purchases FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'social_media_manager'));
CREATE POLICY "SMM can view all products" ON public.products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'social_media_manager'));
CREATE POLICY "SMM view payment proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(),'social_media_manager'));
CREATE POLICY "SMM view private product media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-private-media' AND public.has_role(auth.uid(),'social_media_manager'));

CREATE OR REPLACE FUNCTION public.grant_purchase(_purchase_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT user_id, credits, purchase_type INTO r FROM public.credit_purchases WHERE id = _purchase_id;
  IF r.purchase_type = 'listing_spots' THEN
    INSERT INTO public.listing_spots (user_id, balance) VALUES (r.user_id, r.credits)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.listing_spots.balance + r.credits, updated_at = now();
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (r.user_id, 'listing_spots_added', r.credits || ' listing spots added',
            'Your payment was verified and ' || r.credits || ' listing spots were added.', '/bari-behen-dashboard');
  ELSE
    INSERT INTO public.user_credits (user_id, balance) VALUES (r.user_id, r.credits)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.user_credits.balance + r.credits, updated_at = now();
    INSERT INTO public.credit_transactions (user_id, amount, type, notes, reference_id)
    VALUES (r.user_id, r.credits, 'purchase', _note, _purchase_id);
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (r.user_id, 'credits_added', r.credits || ' credits added',
            'Your payment was verified and ' || r.credits || ' credits have been added to your account.', '/credits');
  END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.grant_purchase(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_credit_purchase(_purchase_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  IF NOT public.is_payment_reviewer(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT status INTO v_status FROM public.credit_purchases WHERE id = _purchase_id FOR UPDATE;
  IF v_status IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'not_found'); END IF;
  IF v_status = 'approved' THEN RETURN jsonb_build_object('success', true, 'already_approved', true); END IF;
  UPDATE public.credit_purchases SET status = 'approved', updated_at = now() WHERE id = _purchase_id;
  PERFORM public.grant_purchase(_purchase_id, 'Payment approved by team');
  RETURN jsonb_build_object('success', true);
END; $$;

CREATE OR REPLACE FUNCTION public.auto_approve_due_credit_purchases()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _minutes integer; _rec record; _count integer := 0;
BEGIN
  SELECT COALESCE((value->>'minutes')::integer, 5) INTO _minutes FROM public.app_settings WHERE key = 'credit_auto_approve_minutes';
  _minutes := COALESCE(_minutes, 5);
  FOR _rec IN SELECT id FROM public.credit_purchases
    WHERE status = 'pending' AND payment_proof_url IS NOT NULL
      AND created_at < now() - (_minutes || ' minutes')::interval
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.credit_purchases SET status = 'approved',
      admin_notes = COALESCE(admin_notes, 'Auto-approved after payment screenshot'), updated_at = now()
    WHERE id = _rec.id;
    PERFORM public.grant_purchase(_rec.id, 'Payment confirmed');
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END; $$;

-- Free (100% off) spot claim; paid packages go through credit_purchases
CREATE OR REPLACE FUNCTION public.claim_free_listing_spots(_spots integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_pkgs jsonb; v_pkg jsonb; v_price numeric; v_disc numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT value INTO v_pkgs FROM public.app_settings WHERE key = 'listing_spot_packages';
  v_disc := COALESCE((v_pkgs->>'discount_percent')::numeric, 100);
  SELECT p INTO v_pkg FROM jsonb_array_elements(COALESCE(v_pkgs->'packages',
    '[{"spots":1,"price":500},{"spots":3,"price":1200},{"spots":5,"price":1800}]'::jsonb)) p
    WHERE (p->>'spots')::int = _spots;
  IF v_pkg IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'invalid_package'); END IF;
  v_price := round((v_pkg->>'price')::numeric * (100 - v_disc) / 100);
  IF v_price > 0 THEN RETURN jsonb_build_object('success', false, 'reason', 'payment_required', 'price', v_price); END IF;
  INSERT INTO public.listing_spots (user_id, balance) VALUES (v_uid, _spots)
  ON CONFLICT (user_id) DO UPDATE SET balance = public.listing_spots.balance + _spots, updated_at = now();
  RETURN jsonb_build_object('success', true, 'spots', _spots);
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_free_listing_spots(integer) TO authenticated;

-- Consume a spot on new listing, only when enforcement is switched on
CREATE OR REPLACE FUNCTION public.consume_listing_spot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_on boolean; v_bal integer;
BEGIN
  SELECT COALESCE((value->>'required')::boolean, false) INTO v_on FROM public.app_settings WHERE key = 'listing_spot_packages';
  IF NOT COALESCE(v_on, false) OR public.has_role(NEW.owner_id,'admin') OR public.has_role(NEW.owner_id,'super_admin') THEN
    RETURN NEW;
  END IF;
  SELECT balance INTO v_bal FROM public.listing_spots WHERE user_id = NEW.owner_id FOR UPDATE;
  IF COALESCE(v_bal,0) < 1 THEN RAISE EXCEPTION 'no_listing_spots'; END IF;
  UPDATE public.listing_spots SET balance = balance - 1, updated_at = now() WHERE user_id = NEW.owner_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_consume_listing_spot BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.consume_listing_spot();

-- Live / Sold toggle (no editing or deleting)
CREATE OR REPLACE FUNCTION public.set_product_sold_status(_product_id uuid, _sold boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.products WHERE id = _product_id;
  IF v_owner IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'not_found'); END IF;
  IF v_uid IS DISTINCT FROM v_owner AND NOT public.is_payment_reviewer(v_uid) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authorized');
  END IF;
  UPDATE public.products SET
    inventory_status = CASE WHEN _sold THEN 'unavailable' ELSE 'available' END,
    listing_active = NOT _sold,
    activated_at = CASE WHEN _sold THEN activated_at ELSE now() END,
    deactivated_at = CASE WHEN _sold THEN now() ELSE NULL END
  WHERE id = _product_id;
  RETURN jsonb_build_object('success', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.set_product_sold_status(uuid, boolean) TO authenticated;