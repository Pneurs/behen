CREATE OR REPLACE FUNCTION public.expire_stale_listings()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  -- Listings are permanent until the seller deletes or marks them sold.
  RETURN 0;
END;
$function$;