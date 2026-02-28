-- Restore strict MFA enforcement for all authenticated users.
-- This supersedes the temporary single-user bypass migration.
CREATE OR REPLACE FUNCTION public.meets_mfa_requirement()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'aal') = 'aal2';
$$;
