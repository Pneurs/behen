CREATE OR REPLACE FUNCTION public.listing_text_has_contact(_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  t text;
BEGIN
  IF _text IS NULL OR btrim(_text) = '' THEN
    RETURN false;
  END IF;
  t := translate(_text, '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789');
  t := regexp_replace(t, '(www\.)?behen\.pk', ' ', 'gi');
  RETURN
    t ~ '(\+|00)\s*9\s*2[\s.\-]*3([\s.\-]*[0-9]){9}'
    OR t ~ '\y0[\s.\-]*3([\s.\-]*[0-9]){9}'
    OR t ~ '[0-9]([\s.\-]*[0-9]){9,}'
    OR t ~* '[a-z0-9._%+-]+\s*@\s*[a-z0-9.-]+\.[a-z]{2,}'
    OR t ~* '\y(gmail|yahoo|hotmail|outlook|icloud)\s*(\.|dot)\s*com\y'
    OR t ~* '\y(whats\s?app|watsapp|wtsapp|whtsapp|wp|telegram|viber|instagram|insta|facebook|fb|tiktok|snapchat|twitter)\y'
    OR t ~* '(https?://|www\.)\S+'
    OR t ~* '\y(call me|contact me|text me|message me|msg me|inbox me|dm me|my number|mera number|call karo|fone karo|phone karo|rabta karo|contact karo)\y'
    OR t ~ '(نمبر|وٹس\s?ایپ|واٹس\s?ایپ|فون کر|کال کر|رابطہ کر|ای میل)';
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_contact_info_in_listing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR NEW.title IS DISTINCT FROM OLD.title) AND public.listing_text_has_contact(NEW.title)
     OR (TG_OP = 'INSERT' OR NEW.description IS DISTINCT FROM OLD.description) AND public.listing_text_has_contact(NEW.description)
     OR (TG_OP = 'INSERT' OR NEW.style_tips IS DISTINCT FROM OLD.style_tips) AND public.listing_text_has_contact(NEW.style_tips)
     OR (TG_OP = 'INSERT' OR NEW.fabric IS DISTINCT FROM OLD.fabric) AND public.listing_text_has_contact(NEW.fabric)
     OR (TG_OP = 'INSERT' OR NEW.color IS DISTINCT FROM OLD.color) AND public.listing_text_has_contact(NEW.color)
     OR (TG_OP = 'INSERT' OR NEW.work_type IS DISTINCT FROM OLD.work_type) AND public.listing_text_has_contact(NEW.work_type)
     OR (TG_OP = 'INSERT' OR NEW.designer IS DISTINCT FROM OLD.designer) AND public.listing_text_has_contact(NEW.designer)
  THEN
    RAISE EXCEPTION 'Contact details (phone, WhatsApp, email, social media or links) are not allowed in listings'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_contact_info_in_listing ON public.products;
CREATE TRIGGER trg_reject_contact_info_in_listing
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.reject_contact_info_in_listing();