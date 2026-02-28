
-- Fix 1: CRITICAL - MFA bypass via trusted device self-insertion
DROP POLICY IF EXISTS "Users can insert their own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can insert trusted devices after MFA" ON public.trusted_devices
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (auth.jwt()->>'aal') = 'aal2'
  );

-- Fix 3: MEDIUM - Cross-tenant metric trigger
CREATE OR REPLACE FUNCTION public.update_metric_last_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.metrics
  SET last_updated_at = now()
  WHERE id = NEW.metric_id
    AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Fix 4: LOW - Revoke public execute on purge function
REVOKE EXECUTE ON FUNCTION public.purge_soft_deleted_items() FROM public, anon, authenticated;
