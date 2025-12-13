-- Create user_earnings table to track balances and referral codes
CREATE TABLE public.user_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  referral_code text UNIQUE,
  referred_by uuid,
  first_product_bonus_claimed boolean DEFAULT false,
  first_order_completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create earning_transactions table for tracking earning history
CREATE TABLE public.earning_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reference_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earning_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_earnings
CREATE POLICY "Users can view their own earnings"
ON public.user_earnings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own earnings"
ON public.user_earnings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own earnings"
ON public.user_earnings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all earnings"
ON public.user_earnings
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update all earnings"
ON public.user_earnings
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS policies for earning_transactions
CREATE POLICY "Users can view their own transactions"
ON public.earning_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.earning_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all transactions"
ON public.earning_transactions
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage all transactions"
ON public.earning_transactions
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_user_earnings_updated_at
BEFORE UPDATE ON public.user_earnings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow anyone to check if a referral code exists (for signup validation)
CREATE POLICY "Anyone can check referral codes"
ON public.user_earnings
FOR SELECT
USING (referral_code IS NOT NULL);