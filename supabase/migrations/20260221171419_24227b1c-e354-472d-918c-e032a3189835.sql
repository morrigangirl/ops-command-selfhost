
-- Now that MFA is mandatory, simplify: always require aal2 for all authenticated users
CREATE OR REPLACE FUNCTION public.meets_mfa_requirement()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'aal') = 'aal2'
$$;
