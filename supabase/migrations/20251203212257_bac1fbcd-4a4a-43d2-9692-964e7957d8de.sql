-- Create enum for order stages
CREATE TYPE public.order_stage AS ENUM (
  'pending_packing_video',
  'pending_pickup',
  'in_rental_period',
  'pending_return_video',
  'pending_acceptance_video',
  'completed',
  'closed'
);

-- Add new columns to bookings table for video verification system
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS order_stage public.order_stage DEFAULT 'pending_packing_video',
ADD COLUMN IF NOT EXISTS packing_video_url TEXT,
ADD COLUMN IF NOT EXISTS packing_video_uploaded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS return_video_url TEXT,
ADD COLUMN IF NOT EXISTS return_video_uploaded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS acceptance_video_url TEXT,
ADD COLUMN IF NOT EXISTS acceptance_video_uploaded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS picked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS picked_by_user_id UUID,
ADD COLUMN IF NOT EXISTS return_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS late_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_fee_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS videos_delete_after TIMESTAMP WITH TIME ZONE;

-- Create offers table for chat-based offers
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  offered_price NUMERIC NOT NULL,
  offered_security_deposit NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on offers table
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for offers
CREATE POLICY "Users can view offers in their conversations"
ON public.offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE chat_conversations.id = offers.conversation_id
    AND (auth.uid() = chat_conversations.renter_id OR auth.uid() = chat_conversations.owner_id)
  )
);

CREATE POLICY "Users can create offers in their conversations"
ON public.offers
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE chat_conversations.id = offers.conversation_id
    AND (auth.uid() = chat_conversations.renter_id OR auth.uid() = chat_conversations.owner_id)
  )
);

CREATE POLICY "Users can update offers in their conversations"
ON public.offers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE chat_conversations.id = offers.conversation_id
    AND (auth.uid() = chat_conversations.renter_id OR auth.uid() = chat_conversations.owner_id)
  )
);

-- Create storage bucket for booking videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-videos', 'booking-videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for booking videos
CREATE POLICY "Users can upload their booking videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'booking-videos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view booking videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'booking-videos');

CREATE POLICY "Users can delete their booking videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'booking-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create trigger to update updated_at on offers
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();