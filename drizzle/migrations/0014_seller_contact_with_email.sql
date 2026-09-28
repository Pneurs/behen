CREATE OR REPLACE FUNCTION public.get_seller_contact(_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_phone text;
  v_email text;
  v_allowed boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  SELECT owner_id, contact_phone INTO v_owner, v_phone
  FROM public.products WHERE id = _product_id;

  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_found');
  END IF;

  IF v_uid = v_owner
     OR public.has_role(v_uid, 'admin')
     OR public.has_role(v_uid, 'super_admin')
     OR EXISTS (SELECT 1 FROM public.contact_unlocks WHERE user_id = v_uid AND product_id = _product_id)
  THEN
    v_allowed := true;
  END IF;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'locked');
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_owner;

  RETURN jsonb_build_object(
    'allowed', true,
    'email', v_email,
    'phone', COALESCE((SELECT p.phone FROM public.profiles p WHERE p.user_id = v_owner), v_phone)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seller_contact(uuid) TO authenticated;