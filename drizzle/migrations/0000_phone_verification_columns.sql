ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verification_code text,
  ADD COLUMN IF NOT EXISTS phone_verification_sent_at timestamptz;