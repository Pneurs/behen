CREATE OR REPLACE FUNCTION public.set_booking_fee_amount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_price numeric; v_type text; v_owner uuid; v_renter uuid; v_rate numeric; v_buyer_paid_at timestamptz;
BEGIN
  SELECT o.offered_price, p.listing_type INTO v_price, v_type
  FROM public.offers o JOIN public.products p ON p.id = o.product_id
  WHERE o.id = NEW.offer_id AND o.conversation_id = NEW.conversation_id AND o.status = 'accepted';
  IF v_price IS NULL THEN RAISE EXCEPTION 'no_accepted_offer'; END IF;
  SELECT owner_id, renter_id INTO v_owner, v_renter FROM public.chat_conversations WHERE id = NEW.conversation_id;
  IF NEW.payer_id <> v_owner AND NEW.payer_id <> v_renter THEN RAISE EXCEPTION 'not_a_participant'; END IF;
  IF EXISTS (SELECT 1 FROM public.booking_fee_payments
             WHERE conversation_id = NEW.conversation_id AND payer_id = NEW.payer_id AND status IN ('pending','approved')) THEN
    RAISE EXCEPTION 'fee_already_submitted';
  END IF;
  IF NEW.payer_id = v_owner THEN
    -- Buyer pays first; seller then has 24 hours from the buyer's submission.
    SELECT min(created_at) INTO v_buyer_paid_at FROM public.booking_fee_payments
      WHERE conversation_id = NEW.conversation_id AND payer_id = v_renter AND status IN ('pending','approved');
    IF v_buyer_paid_at IS NULL THEN RAISE EXCEPTION 'buyer_pays_first'; END IF;
    IF v_buyer_paid_at < now() - interval '24 hours' THEN RAISE EXCEPTION 'seller_deadline_passed'; END IF;
    -- Launch promo: seller 5% on sales (normally 7.5%), 8.5% on rentals (normally 10%).
    v_rate := CASE WHEN v_type = 'sale' THEN 0.05 ELSE 0.085 END;
  ELSE
    -- Launch promo: buyer 2.5% on sales (normally 5%), 4.25% on rentals (normally 8.5%).
    v_rate := CASE WHEN v_type = 'sale' THEN 0.025 ELSE 0.0425 END;
  END IF;
  NEW.amount_pkr := ceil(round(v_price * v_rate, 2));
  NEW.status := 'pending';
  RETURN NEW;
END $function$;