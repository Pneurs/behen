-- Add push_token column to profiles for storing device push notification tokens
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;