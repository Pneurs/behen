-- Storage policies for payment screenshots (private bucket, per-user folders)
CREATE POLICY "Users upload own payment proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

-- Auto-approval waiting time setting
INSERT INTO public.app_settings (key, value)
VALUES ('credit_auto_approve_minutes', '{"minutes": 5}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Automatically approve manual purchases that have a payment screenshot
-- and have been waiting longer than the configured number of minutes.
CREATE OR REPLACE FUNCTION public.auto_approve_due_credit_purchases()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _minutes integer;
  _rec record;
  _count integer := 0;
BEGIN
  SELECT COALESCE((value->>'minutes')::integer, 5) INTO _minutes
  FROM public.app_settings WHERE key = 'credit_auto_approve_minutes';
  _minutes := COALESCE(_minutes, 5);

  FOR _rec IN
    SELECT id, user_id, credits
    FROM public.credit_purchases
    WHERE status = 'pending'
      AND payment_proof_url IS NOT NULL
      AND created_at < now() - (_minutes || ' minutes')::interval
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.credit_purchases
    SET status = 'approved',
        admin_notes = COALESCE(admin_notes, 'Auto-approved after payment screenshot'),
        updated_at = now()
    WHERE id = _rec.id;

    INSERT INTO public.user_credits (user_id, balance)
    VALUES (_rec.user_id, _rec.credits)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.user_credits.balance + _rec.credits,
                                        updated_at = now();

    INSERT INTO public.credit_transactions (user_id, amount, type, notes, reference_id)
    VALUES (_rec.user_id, _rec.credits, 'purchase',
            'Payment confirmed — ' || _rec.credits || ' credits', _rec.id);

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_approve_due_credit_purchases() TO authenticated, anon, service_role;