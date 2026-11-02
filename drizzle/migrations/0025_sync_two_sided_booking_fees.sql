-- Records the two-sided fee model (already live) in migration history:
-- buyer AND seller each pay 5% on sales / 8.5% on rentals; booking confirms only when both are approved.
DROP POLICY IF EXISTS "Buyer submits own fee payment" ON public.booking_fee_payments;
DROP POLICY IF EXISTS "Buyer or seller submits own fee payment" ON public.booking_fee_payments;
CREATE POLICY "Buyer or seller submits own fee payment" ON public.booking_fee_payments
FOR INSERT TO authenticated
WITH CHECK (
  payer_id = auth.uid() AND status = 'pending' AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = booking_fee_payments.conversation_id
      AND (c.renter_id = auth.uid() OR c.owner_id = auth.uid())
      AND c.owner_id = booking_fee_payments.owner_id
      AND c.product_id = booking_fee_payments.product_id
  )
);

CREATE OR REPLACE FUNCTION public.set_booking_fee_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_price numeric; v_type text;
BEGIN
  SELECT o.offered_price, p.listing_type INTO v_price, v_type
  FROM public.offers o JOIN public.products p ON p.id = o.product_id
  WHERE o.id = NEW.offer_id AND o.conversation_id = NEW.conversation_id AND o.status = 'accepted';
  IF v_price IS NULL THEN RAISE EXCEPTION 'no_accepted_offer'; END IF;
  IF EXISTS (SELECT 1 FROM public.booking_fee_payments
             WHERE conversation_id = NEW.conversation_id AND payer_id = NEW.payer_id AND status IN ('pending','approved')) THEN
    RAISE EXCEPTION 'fee_already_submitted';
  END IF;
  -- Each side (buyer and seller) pays its own fee: 5% on sales, 8.5% on rentals.
  NEW.amount_pkr := ceil(v_price * CASE WHEN v_type = 'sale' THEN 0.05 ELSE 0.085 END);
  NEW.status := 'pending';
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.grant_booking_fee(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.booking_fee_payments%ROWTYPE; c record; v_bp text; v_bn text; v_sp text; v_sn text;
  buyer_ok boolean; seller_ok boolean;
BEGIN
  SELECT * INTO r FROM public.booking_fee_payments WHERE id = _id;
  SELECT * INTO c FROM public.chat_conversations WHERE id = r.conversation_id;
  SELECT EXISTS (SELECT 1 FROM public.booking_fee_payments WHERE conversation_id = c.id AND payer_id = c.renter_id AND status = 'approved') INTO buyer_ok;
  SELECT EXISTS (SELECT 1 FROM public.booking_fee_payments WHERE conversation_id = c.id AND payer_id = c.owner_id AND status = 'approved') INTO seller_ok;

  IF NOT (buyer_ok AND seller_ok) THEN
    INSERT INTO public.chat_messages (conversation_id, sender_id, message)
    VALUES (c.id, r.payer_id,
      '✅ ' || CASE WHEN r.payer_id = c.owner_id THEN 'Seller' ELSE 'Buyer' END ||
      '''s platform fee verified by Behen.pk. Waiting for the ' ||
      CASE WHEN r.payer_id = c.owner_id THEN 'buyer' ELSE 'seller' END ||
      '''s fee — contact details unlock once both are verified.');
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (CASE WHEN r.payer_id = c.owner_id THEN c.renter_id ELSE c.owner_id END,
      'booking_fee_pending_other', 'Your turn to pay the platform fee',
      'The other side has paid their Behen.pk fee. Pay yours to unlock contact details.', '/chat?id=' || c.id);
    RETURN;
  END IF;

  PERFORM set_config('app.fee_ok', 'on', true);
  UPDATE public.chat_conversations SET is_booking_confirmed = true WHERE id = c.id;
  UPDATE public.bookings SET payment_status = 'verified', booking_status = 'confirmed' WHERE id = c.booking_id;
  INSERT INTO public.contact_unlocks (user_id, product_id, credits_spent)
  SELECT c.renter_id, c.product_id, 0
  WHERE NOT EXISTS (SELECT 1 FROM public.contact_unlocks WHERE user_id = c.renter_id AND product_id = c.product_id);
  SELECT name, phone INTO v_bn, v_bp FROM public.profiles WHERE user_id = c.renter_id;
  SELECT name, phone INTO v_sn, v_sp FROM public.profiles WHERE user_id = c.owner_id;
  INSERT INTO public.chat_messages (conversation_id, sender_id, message)
  VALUES (c.id, r.payer_id,
    '✅ Both platform fees verified by Behen.pk — booking confirmed!' || E'\n\n' ||
    '👩 Bari Behen: ' || coalesce(v_sn,'') || ' — ' || coalesce(v_sp,'see contact on dress page') || E'\n' ||
    '👧 Choti Behen: ' || coalesce(v_bn,'') || ' — ' || coalesce(v_bp,'not added') || E'\n\n' ||
    'You can now share address and arrange pickup/delivery.');
  INSERT INTO public.notifications (user_id, type, title, message, link) VALUES
    (c.renter_id, 'booking_confirmed', 'Booking confirmed', 'Both platform fees were verified. Contact details are now unlocked.', '/chat?id=' || c.id),
    (c.owner_id, 'booking_confirmed', 'Booking confirmed', 'Both platform fees were verified. Contact details are now unlocked.', '/chat?id=' || c.id);
END $function$;

REVOKE EXECUTE ON FUNCTION public.grant_booking_fee(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_approve_due_booking_fees() FROM PUBLIC, anon, authenticated;