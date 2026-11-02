-- Profiles: no more world-readable rows (phone, push token, verification codes)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'social_media_manager')
  );

-- Safe public fields only (name, city/area, verification badge)
CREATE OR REPLACE FUNCTION public.get_public_profiles(_user_ids uuid[])
RETURNS TABLE(user_id uuid, name text, role text, city text, area text, phone_verified boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.name, p.role, p.city, p.area, p.phone_verified, p.created_at
  FROM public.profiles p
  WHERE p.user_id = ANY (_user_ids[1:100])
$$;
REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;

-- Contact details for the two people in a paid booking
CREATE OR REPLACE FUNCTION public.get_booking_contacts(_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_owner uuid; v_renter uuid; v_status text;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT owner_id, renter_id, payment_status::text INTO v_owner, v_renter, v_status
  FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF public.is_payment_reviewer(v_uid) IS NOT TRUE THEN
    IF v_uid <> v_owner AND v_uid <> v_renter THEN RETURN NULL; END IF;
    IF v_status <> 'verified' THEN RETURN NULL; END IF;
  END IF;
  RETURN jsonb_build_object(
    'owner', (SELECT jsonb_build_object('name', name, 'phone', phone, 'city', city, 'area', area) FROM public.profiles WHERE user_id = v_owner),
    'renter', (SELECT jsonb_build_object('name', name, 'phone', phone, 'city', city, 'area', area) FROM public.profiles WHERE user_id = v_renter)
  );
END $$;
REVOKE ALL ON FUNCTION public.get_booking_contacts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booking_contacts(uuid) TO authenticated;

-- Notifications: only to yourself or to the other person in one of your chats, with in-app links only
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
CREATE POLICY "Users can notify their chat counterparts" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
    (link IS NULL OR link ~ '^/[^/\\]')
    AND (
      auth.uid() = user_id
      OR public.is_payment_reviewer(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE (c.owner_id = auth.uid() AND c.renter_id = notifications.user_id)
           OR (c.renter_id = auth.uid() AND c.owner_id = notifications.user_id)
      )
    )
  );

-- Reviews: visible for published listings, or to the people involved
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Reviews of published listings are visible" ON public.reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = reviews.product_id AND p.status = 'published')
    OR auth.uid() = reviewer_id OR auth.uid() = owner_id
    OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

-- Referral records are written only by the server during email verification
DROP POLICY IF EXISTS "Authenticated users can insert referral signups" ON public.referral_signups;

-- Email verification tokens: server-only
DROP POLICY IF EXISTS "Anyone can create verification tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Anyone can delete verification tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Anyone can read verification tokens" ON public.email_verification_tokens;
REVOKE ALL ON public.email_verification_tokens FROM anon, authenticated;
GRANT ALL ON public.email_verification_tokens TO service_role;
ALTER TABLE public.email_verification_tokens ADD COLUMN IF NOT EXISTS user_id uuid;

-- App settings: hide internal secrets from the public
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Public app settings are readable" ON public.app_settings
  FOR SELECT USING (
    key NOT IN ('whatsapp_verify_link_token', 'listing_expiry_cron')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- Storage: product-images (public bucket; files served by public URL, listing limited to own folder)
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Users can list their own product images" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'product-images' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
CREATE POLICY "Users upload product images to their own folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'product-images' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Storage: booking-videos
DROP POLICY IF EXISTS "Anyone can view booking videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their booking videos" ON storage.objects;
CREATE POLICY "Booking participants can list booking videos" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'booking-videos' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      OR public.is_payment_reviewer((SELECT auth.uid()))
      OR EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE (b.id::text = (storage.foldername(name))[1] OR b.id::text = (storage.foldername(name))[2])
          AND (SELECT auth.uid()) IN (b.owner_id, b.renter_id)
      )
    )
  );
CREATE POLICY "Users upload booking videos to their own folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'booking-videos' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Storage: branding-assets (served by public URL; only super admins list/manage)
DROP POLICY IF EXISTS "Anyone can view branding assets" ON storage.objects;
CREATE POLICY "Super admins can list branding assets" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'branding-assets' AND public.has_role((SELECT auth.uid()), 'super_admin')
  );

-- Storage: private product media - owners and admins only; buyers get short-lived links from the server
DROP POLICY IF EXISTS "Owners read private product media" ON storage.objects;
CREATE POLICY "Owners read private product media" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'product-private-media' AND (
      (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      OR public.has_role((SELECT auth.uid()), 'admin')
      OR public.has_role((SELECT auth.uid()), 'super_admin')
    )
  );