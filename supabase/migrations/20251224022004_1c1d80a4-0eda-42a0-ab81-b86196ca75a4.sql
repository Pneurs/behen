-- Create referral_signups table to track signup referrals
CREATE TABLE public.referral_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  bonus_amount NUMERIC NOT NULL DEFAULT 150,
  bonus_credited BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT referral_signups_referred_user_unique UNIQUE (referred_user_id)
);

-- Enable RLS
ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;

-- Super admins can view all referral signups
CREATE POLICY "Super admins can view all referral signups"
ON public.referral_signups
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Referrers can view their own referrals
CREATE POLICY "Referrers can view their own referrals"
ON public.referral_signups
FOR SELECT
USING (auth.uid() = referrer_user_id);

-- Allow inserts for authenticated users (used during signup)
CREATE POLICY "Authenticated users can insert referral signups"
ON public.referral_signups
FOR INSERT
WITH CHECK (true);

-- Enable realtime for referral tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_signups;