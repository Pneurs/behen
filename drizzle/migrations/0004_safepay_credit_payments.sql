ALTER TABLE public.credit_purchases ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'manual';
ALTER TABLE public.credit_purchases ADD COLUMN IF NOT EXISTS safepay_tracker text;

CREATE OR REPLACE FUNCTION public.complete_credit_purchase(_purchase_id uuid, _tracker text, _provider_reference text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase public.credit_purchases%ROWTYPE;
  v_txn_id uuid;
BEGIN
  SELECT * INTO v_purchase FROM public.credit_purchases WHERE id = _purchase_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'purchase_not_found');
  END IF;

  IF v_purchase.status = 'approved' THEN
    RETURN jsonb_build_object('success', true, 'already_approved', true);
  END IF;

  UPDATE public.credit_purchases
  SET status = 'approved',
      safepay_tracker = COALESCE(_tracker, safepay_tracker),
      payment_reference = COALESCE(_provider_reference, payment_reference),
      updated_at = now()
  WHERE id = _purchase_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, notes, reference_id)
  VALUES (v_purchase.user_id, v_purchase.credits, 'purchase', 'SafePay payment — ' || v_purchase.credits || ' credits', _purchase_id)
  RETURNING id INTO v_txn_id;

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (v_purchase.user_id, v_purchase.credits)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.user_credits.balance + EXCLUDED.balance,
      updated_at = now();

  RETURN jsonb_build_object('success', true, 'transaction_id', v_txn_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_credit_purchase(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_credit_purchase(uuid, text, text) TO service_role;
