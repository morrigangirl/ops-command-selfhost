
-- 1. Fix chat_messages cross-tenant foreign-key reference
-- Drop existing INSERT/UPDATE policies and replace with session-ownership check

DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;

CREATE POLICY "Users can insert own messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = session_id AND cs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own messages"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.chat_sessions cs
    WHERE cs.id = session_id AND cs.user_id = auth.uid()
  )
);

-- 2. Create rate_limits table for per-user AI call throttling
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  call_count integer NOT NULL DEFAULT 1
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only the service role (edge functions) should read/write this table
-- No public/authenticated access needed
CREATE POLICY "No direct user access to rate_limits"
ON public.rate_limits
FOR ALL
USING (false);

-- Create index for efficient lookups
CREATE INDEX idx_rate_limits_user_function ON public.rate_limits (user_id, function_name, window_start);

-- Helper function for edge functions to check/increment rate limit
-- Returns true if request is allowed, false if rate limited
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_function_name text,
  p_max_calls integer DEFAULT 30,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamp with time zone;
  v_current_count integer;
BEGIN
  v_window_start := date_trunc('hour', now()) + 
    (floor(extract(minute from now()) / p_window_minutes) * p_window_minutes) * interval '1 minute';

  -- Try to increment existing window
  UPDATE public.rate_limits
  SET call_count = call_count + 1
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND window_start = v_window_start
  RETURNING call_count INTO v_current_count;

  IF v_current_count IS NOT NULL THEN
    RETURN v_current_count <= p_max_calls;
  END IF;

  -- No existing window, insert new one
  INSERT INTO public.rate_limits (user_id, function_name, window_start, call_count)
  VALUES (p_user_id, p_function_name, v_window_start, 1);

  -- Cleanup old windows (older than 24 hours)
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '24 hours';

  RETURN true;
END;
$$;

-- Revoke direct execute from public/authenticated
REVOKE EXECUTE ON FUNCTION public.check_rate_limit FROM public;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit FROM authenticated;
