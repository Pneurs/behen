-- Add email_verified column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  user_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Create index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email ON public.email_verification_tokens(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert (for signup)
CREATE POLICY "Anyone can create verification tokens" 
ON public.email_verification_tokens 
FOR INSERT 
WITH CHECK (true);

-- Allow anonymous select (for verification)
CREATE POLICY "Anyone can read verification tokens" 
ON public.email_verification_tokens 
FOR SELECT 
USING (true);

-- Allow anonymous delete (for cleanup after verification)
CREATE POLICY "Anyone can delete verification tokens" 
ON public.email_verification_tokens 
FOR DELETE 
USING (true);