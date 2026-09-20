-- Credits balance per user
CREATE TABLE public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.user_credits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all credits" ON public.user_credits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can update credits" ON public.user_credits
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can insert credits" ON public.user_credits
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ledger
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL,
  notes text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit transactions" ON public.credit_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all credit transactions" ON public.credit_transactions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Per-product contact unlocks
CREATE TABLE public.contact_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  credits_spent integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

GRANT SELECT ON public.contact_unlocks TO authenticated;
GRANT ALL ON public.contact_unlocks TO service_role;
ALTER TABLE public.contact_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocks" ON public.contact_unlocks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all unlocks" ON public.contact_unlocks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Credit purchases
CREATE TABLE public.credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credits integer NOT NULL,
  amount_pkr numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_proof_url text,
  payment_reference text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.credit_purchases TO authenticated;
GRANT UPDATE ON public.credit_purchases TO authenticated;
GRANT ALL ON public.credit_purchases TO service_role;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.credit_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own purchases" ON public.credit_purchases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all purchases" ON public.credit_purchases
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can update purchases" ON public.credit_purchases
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_credit_purchases_updated_at BEFORE UPDATE ON public.credit_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic unlock function
CREATE OR REPLACE FUNCTION public.unlock_contact(_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cost integer;
  v_balance integer;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.contact_unlocks WHERE user_id = v_uid AND product_id = _product_id) THEN
    RETURN jsonb_build_object('success', true, 'already_unlocked', true);
  END IF;

  SELECT COALESCE((value->>'cost')::int, 1) INTO v_cost
  FROM public.app_settings WHERE key = 'credit_cost_per_unlock';
  IF v_cost IS NULL THEN v_cost := 1; END IF;

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (v_uid, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance INTO v_balance FROM public.user_credits WHERE user_id = v_uid FOR UPDATE;

  IF COALESCE(v_balance, 0) < v_cost THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_credits', 'balance', COALESCE(v_balance, 0), 'cost', v_cost);
  END IF;

  UPDATE public.user_credits SET balance = balance - v_cost WHERE user_id = v_uid;

  INSERT INTO public.contact_unlocks (user_id, product_id, credits_spent)
  VALUES (v_uid, _product_id, v_cost);

  INSERT INTO public.credit_transactions (user_id, amount, type, notes, reference_id)
  VALUES (v_uid, -v_cost, 'unlock', 'Unlocked seller contact details', _product_id);

  RETURN jsonb_build_object('success', true, 'balance', COALESCE(v_balance, 0) - v_cost);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_contact(uuid) TO authenticated;

-- Admin credit grant
CREATE OR REPLACE FUNCTION public.admin_add_credits(_user_id uuid, _credits integer, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (_user_id, GREATEST(_credits, 0))
  ON CONFLICT (user_id) DO UPDATE SET balance = public.user_credits.balance + _credits;

  INSERT INTO public.credit_transactions (user_id, amount, type, notes)
  VALUES (_user_id, _credits, 'admin_grant', COALESCE(_notes, 'Credits added by admin'));

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer, text) TO authenticated;

-- Approve a purchase and credit the buyer
CREATE OR REPLACE FUNCTION public.admin_approve_credit_purchase(_purchase_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid;
  v_credits integer;
  v_status text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT user_id, credits, status INTO v_user, v_credits, v_status
  FROM public.credit_purchases WHERE id = _purchase_id FOR UPDATE;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found');
  END IF;
  IF v_status = 'approved' THEN
    RETURN jsonb_build_object('success', true, 'already_approved', true);
  END IF;

  UPDATE public.credit_purchases SET status = 'approved' WHERE id = _purchase_id;

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (v_user, v_credits)
  ON CONFLICT (user_id) DO UPDATE SET balance = public.user_credits.balance + v_credits;

  INSERT INTO public.credit_transactions (user_id, amount, type, notes, reference_id)
  VALUES (v_user, v_credits, 'purchase', 'Credit package purchase approved', _purchase_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_credit_purchase(uuid) TO authenticated;