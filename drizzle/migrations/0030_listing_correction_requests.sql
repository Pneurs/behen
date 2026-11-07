ALTER TABLE public.products ADD COLUMN IF NOT EXISTS correction_reason text, ADD COLUMN IF NOT EXISTS correction_kind text, ADD COLUMN IF NOT EXISTS correction_requested_at timestamptz, ADD COLUMN IF NOT EXISTS own_media_confirmed boolean NOT NULL DEFAULT false;
GRANT SELECT (correction_reason, correction_kind, correction_requested_at, own_media_confirmed), UPDATE (correction_reason, correction_kind, correction_requested_at, own_media_confirmed), INSERT (own_media_confirmed) ON public.products TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_listing_corrections() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE changed boolean; staff boolean := public.has_role(auth.uid(), 'super_admin');
BEGIN
 IF TG_OP='INSERT' THEN
  IF auth.uid() IS NOT NULL AND NOT staff AND NOT NEW.own_media_confirmed THEN RAISE EXCEPTION 'Confirm that photos and video are of your own dress'; END IF;
  IF auth.uid() IS NOT NULL AND NOT staff AND (NEW.correction_reason IS NOT NULL OR NEW.correction_kind IS NOT NULL OR NEW.correction_requested_at IS NOT NULL) THEN RAISE EXCEPTION 'Only super admin can request corrections'; END IF;
  RETURN NEW;
 END IF;
 IF staff THEN
  IF NEW.listing_active AND OLD.correction_reason IS NOT NULL AND NEW.correction_reason IS NOT DISTINCT FROM OLD.correction_reason THEN NEW.correction_reason:=NULL; NEW.correction_kind:=NULL; NEW.correction_requested_at:=NULL; END IF;
  RETURN NEW;
 END IF;
 IF (NEW.correction_reason,NEW.correction_kind,NEW.correction_requested_at) IS DISTINCT FROM (OLD.correction_reason,OLD.correction_kind,OLD.correction_requested_at) THEN RAISE EXCEPTION 'Only super admin can change correction requests'; END IF;
 IF OLD.correction_reason IS NOT NULL THEN
  changed := (to_jsonb(NEW) - ARRAY['updated_at','listing_active','activated_at','deactivated_at','inventory_status','status','own_media_confirmed','views_count','times_rented','last_rented_on']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['updated_at','listing_active','activated_at','deactivated_at','inventory_status','status','own_media_confirmed','views_count','times_rented','last_rented_on']);
  IF changed AND auth.uid()=OLD.owner_id AND NEW.own_media_confirmed THEN
   IF OLD.correction_kind='photos' AND NEW.public_images IS NOT DISTINCT FROM OLD.public_images AND NEW.real_images IS NOT DISTINCT FROM OLD.real_images AND NEW.private_image_paths IS NOT DISTINCT FROM OLD.private_image_paths THEN RAISE EXCEPTION 'Replace the requested dress photos before republishing'; END IF;
   IF OLD.correction_kind='video' AND NEW.uploaded_video_path IS NOT DISTINCT FROM OLD.uploaded_video_path THEN RAISE EXCEPTION 'Upload your own dress video before republishing'; END IF;
   NEW.correction_reason:=NULL; NEW.correction_kind:=NULL; NEW.correction_requested_at:=NULL; NEW.listing_active:=true; NEW.status:='published'; NEW.activated_at:=now(); NEW.deactivated_at:=NULL;
  ELSIF NEW.listing_active THEN RAISE EXCEPTION 'Edit and correct this listing before republishing'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_listing_corrections BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.guard_listing_corrections();
CREATE OR REPLACE FUNCTION public.request_listing_correction(_product_id uuid, _reason text, _kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF length(trim(_reason))<5 OR length(_reason)>1000 OR _kind NOT IN ('photos','video','contact','other') THEN RAISE EXCEPTION 'Choose a reason and add a correction note'; END IF;
 UPDATE public.products SET correction_reason=trim(_reason),correction_kind=_kind,correction_requested_at=now(),listing_active=false,deactivated_at=now() WHERE id=_product_id RETURNING owner_id INTO owner;
 IF owner IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
 INSERT INTO public.notifications(user_id,type,title,message,link) VALUES(owner,'listing_correction','Please correct your listing',trim(_reason),'/list-dress?edit='||_product_id);
 RETURN jsonb_build_object('success',true);
END $$;
REVOKE ALL ON FUNCTION public.request_listing_correction(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_listing_correction(uuid,text,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.get_public_product(_product_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(p) - ARRAY['private_image_paths','uploaded_video_path','real_images','video_url','contact_phone','pickup_location','dropoff_location','latitude','longitude','correction_reason','correction_kind','correction_requested_at','own_media_confirmed'] FROM public.products p WHERE p.id=_product_id AND p.status='published' AND COALESCE(p.listing_active,true) LIMIT 1
$$;