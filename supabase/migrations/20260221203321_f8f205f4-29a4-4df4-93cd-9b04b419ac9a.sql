
CREATE TABLE public.token_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  model text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token usage"
ON public.token_usage FOR SELECT
USING (auth.uid() = user_id AND meets_mfa_requirement());

CREATE POLICY "No direct user insert to token_usage"
ON public.token_usage FOR INSERT
WITH CHECK (false);

CREATE INDEX idx_token_usage_user_created ON public.token_usage (user_id, created_at DESC);
CREATE INDEX idx_token_usage_function ON public.token_usage (user_id, function_name);
