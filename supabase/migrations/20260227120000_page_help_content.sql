CREATE TABLE public.page_help_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_key text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  what_this_page_does text NOT NULL DEFAULT '',
  what_is_expected text NOT NULL DEFAULT '',
  required_inputs text NOT NULL DEFAULT '',
  primary_actions text NOT NULL DEFAULT '',
  common_mistakes text NOT NULL DEFAULT '',
  next_steps text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'llm', 'seed')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, route_key)
);

CREATE TABLE public.page_help_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_help_id uuid NOT NULL REFERENCES public.page_help_content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  route_key text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  what_this_page_does text NOT NULL,
  what_is_expected text NOT NULL,
  required_inputs text NOT NULL,
  primary_actions text NOT NULL,
  common_mistakes text NOT NULL,
  next_steps text NOT NULL,
  source text NOT NULL,
  version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_help_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_help_content_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own page help content"
ON public.page_help_content FOR SELECT
USING (auth.uid() = user_id AND public.meets_mfa_requirement());

CREATE POLICY "Users can insert own page help content"
ON public.page_help_content FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

CREATE POLICY "Users can update own page help content"
ON public.page_help_content FOR UPDATE
USING (auth.uid() = user_id AND public.meets_mfa_requirement())
WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

CREATE POLICY "Users can delete own page help content"
ON public.page_help_content FOR DELETE
USING (auth.uid() = user_id AND public.meets_mfa_requirement());

CREATE POLICY "Users can view own page help content versions"
ON public.page_help_content_versions FOR SELECT
USING (auth.uid() = user_id AND public.meets_mfa_requirement());

CREATE OR REPLACE FUNCTION public.bump_page_help_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_page_help_content_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.page_help_content_versions (
    page_help_id,
    user_id,
    route_key,
    title,
    summary,
    what_this_page_does,
    what_is_expected,
    required_inputs,
    primary_actions,
    common_mistakes,
    next_steps,
    source,
    version
  )
  VALUES (
    NEW.id,
    NEW.user_id,
    NEW.route_key,
    NEW.title,
    NEW.summary,
    NEW.what_this_page_does,
    NEW.what_is_expected,
    NEW.required_inputs,
    NEW.primary_actions,
    NEW.common_mistakes,
    NEW.next_steps,
    NEW.source,
    NEW.version
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_page_help_content_updated_at
BEFORE UPDATE ON public.page_help_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER bump_page_help_content_version
BEFORE UPDATE ON public.page_help_content
FOR EACH ROW EXECUTE FUNCTION public.bump_page_help_version();

CREATE TRIGGER snapshot_page_help_content_after_insert
AFTER INSERT ON public.page_help_content
FOR EACH ROW EXECUTE FUNCTION public.snapshot_page_help_content_version();

CREATE TRIGGER snapshot_page_help_content_after_update
AFTER UPDATE ON public.page_help_content
FOR EACH ROW EXECUTE FUNCTION public.snapshot_page_help_content_version();

CREATE INDEX idx_page_help_content_user_route ON public.page_help_content (user_id, route_key);
CREATE INDEX idx_page_help_versions_user_route_created ON public.page_help_content_versions (user_id, route_key, created_at DESC);
