CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IN ('ghunvtazeen@gmail.com', 'behenadmin@nexonelabs.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

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

    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (_rec.user_id, 'credits_added',
            _rec.credits || ' credits added',
            'Your payment was verified and ' || _rec.credits || ' credits have been added to your account.',
            '/credits');

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;