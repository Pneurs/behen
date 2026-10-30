CREATE TABLE public.booking_fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  booking_id uuid,
  product_id uuid NOT NULL,
  payer_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  amount_pkr numeric NOT NULL,
  transaction_id text NOT NULL,
  proof_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX booking_fee_payments_trx_uidx ON public.booking_fee_payments (upper(btrim(transaction_id)));
CREATE INDEX booking_fee_payments_conv_idx ON public.booking_fee_payments (conversation_id);

GRANT SELECT, INSERT ON public.booking_fee_payments TO authenticated;
GRANT ALL ON public.booking_fee_payments TO service_role;
ALTER TABLE public.booking_fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and reviewers view fee payments" ON public.booking_fee_payments
FOR SELECT TO authenticated USING (
  payer_id = auth.uid() OR owner_id = auth.uid() OR public.is_payment_reviewer(auth.uid())
);
CREATE POLICY "Buyer submits own fee payment" ON public.booking_fee_payments
FOR INSERT TO authenticated WITH CHECK (
  payer_id = auth.uid() AND status = 'pending'
  AND EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.renter_id = auth.uid() AND c.owner_id = booking_fee_payments.owner_id AND c.product_id = booking_fee_payments.product_id)
);

CREATE TRIGGER update_booking_fee_payments_updated_at BEFORE UPDATE ON public.booking_fee_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fee amount is computed server-side: 5% sale, 10% rental, from the accepted offer
CREATE OR REPLACE FUNCTION public.set_booking_fee_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_price numeric; v_type text;
BEGIN
  SELECT o.offered_price, p.listing_type INTO v_price, v_type
  FROM public.offers o JOIN public.products p ON p.id = o.product_id
  WHERE o.id = NEW.offer_id AND o.conversation_id = NEW.conversation_id AND o.status = 'accepted';
  IF v_price IS NULL THEN RAISE EXCEPTION 'no_accepted_offer'; END IF;
  NEW.amount_pkr := ceil(v_price * CASE WHEN v_type = 'sale' THEN 0.05 ELSE 0.10 END);
  NEW.status := 'pending';
  RETURN NEW;
END $$;
CREATE TRIGGER trg_set_booking_fee_amount BEFORE INSERT ON public.booking_fee_payments
FOR EACH ROW EXECUTE FUNCTION public.set_booking_fee_amount();

-- Only the fee approval may mark a conversation as confirmed
CREATE OR REPLACE FUNCTION public.protect_booking_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_booking_confirmed IS DISTINCT FROM OLD.is_booking_confirmed
     AND NOT public.is_payment_reviewer(auth.uid())
     AND coalesce(current_setting('app.fee_ok', true), '') <> 'on' THEN
    NEW.is_booking_confirmed := OLD.is_booking_confirmed;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_booking_confirmation BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.protect_booking_confirmation();

CREATE OR REPLACE FUNCTION public.grant_booking_fee(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.booking_fee_payments%ROWTYPE; v_bp text; v_bn text; v_sp text; v_sn text;
BEGIN
  SELECT * INTO r FROM public.booking_fee_payments WHERE id = _id;
  PERFORM set_config('app.fee_ok', 'on', true);
  UPDATE public.chat_conversations SET is_booking_confirmed = true WHERE id = r.conversation_id;
  UPDATE public.bookings SET payment_status = 'verified', booking_status = 'confirmed'
    WHERE id = (SELECT booking_id FROM public.chat_conversations WHERE id = r.conversation_id);
  INSERT INTO public.contact_unlocks (user_id, product_id, credits_spent)
  SELECT r.payer_id, r.product_id, 0
  WHERE NOT EXISTS (SELECT 1 FROM public.contact_unlocks WHERE user_id = r.payer_id AND product_id = r.product_id);
  SELECT name, phone INTO v_bn, v_bp FROM public.profiles WHERE user_id = r.payer_id;
  SELECT name, phone INTO v_sn, v_sp FROM public.profiles WHERE user_id = r.owner_id;
  INSERT INTO public.chat_messages (conversation_id, sender_id, message)
  VALUES (r.conversation_id, r.payer_id,
    '✅ Platform fee verified by Behen.pk — booking confirmed!' || E'\n\n' ||
    '👩 Bari Behen: ' || coalesce(v_sn,'') || ' — ' || coalesce(v_sp,'see contact on dress page') || E'\n' ||
    '👧 Choti Behen: ' || coalesce(v_bn,'') || ' — ' || coalesce(v_bp,'not added') || E'\n\n' ||
    'You can now share address and arrange pickup/delivery.');
  INSERT INTO public.notifications (user_id, type, title, message, link) VALUES
    (r.payer_id, 'booking_confirmed', 'Booking confirmed', 'Your platform fee was verified. Contact details are now unlocked.', '/chat?id=' || r.conversation_id),
    (r.owner_id, 'booking_confirmed', 'Booking confirmed', 'The buyer''s platform fee was verified. Contact details are now unlocked.', '/chat?id=' || r.conversation_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.grant_booking_fee(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.auto_approve_due_booking_fees()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _minutes integer; _rec record; _count integer := 0;
BEGIN
  SELECT COALESCE((value->>'minutes')::integer, 5) INTO _minutes FROM public.app_settings WHERE key = 'credit_auto_approve_minutes';
  _minutes := COALESCE(_minutes, 5);
  FOR _rec IN SELECT id FROM public.booking_fee_payments
    WHERE status = 'pending' AND created_at < now() - (_minutes || ' minutes')::interval
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.booking_fee_payments SET status = 'approved', admin_notes = COALESCE(admin_notes, 'Auto-approved') WHERE id = _rec.id;
    PERFORM public.grant_booking_fee(_rec.id);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END $$;

CREATE OR REPLACE FUNCTION public.admin_review_booking_fee(_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_status text;
BEGIN
  IF NOT public.is_payment_reviewer(auth.uid()) THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT status INTO v_status FROM public.booking_fee_payments WHERE id = _id FOR UPDATE;
  IF v_status IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'not_found'); END IF;
  IF v_status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'reason', 'already_' || v_status); END IF;
  IF _approve THEN
    UPDATE public.booking_fee_payments SET status = 'approved', admin_notes = _notes WHERE id = _id;
    PERFORM public.grant_booking_fee(_id);
  ELSE
    UPDATE public.booking_fee_payments SET status = 'rejected', admin_notes = COALESCE(_notes, 'Payment could not be verified') WHERE id = _id;
    INSERT INTO public.notifications (user_id, type, title, message, link)
    SELECT payer_id, 'booking_fee_rejected', 'Payment not verified', 'We could not verify your platform fee payment. Please check and submit again.', '/chat?id=' || conversation_id
    FROM public.booking_fee_payments WHERE id = _id;
  END IF;
  RETURN jsonb_build_object('success', true);
END $$;