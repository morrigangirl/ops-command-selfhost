
-- 1. metrics table
CREATE TABLE public.metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  definition text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'count',
  current_value numeric NULL,
  source_note text NULL,
  confidence text NOT NULL DEFAULT 'low',
  confidence_note text NULL,
  owner_id uuid NULL REFERENCES public.people(id) ON DELETE SET NULL,
  related_project_id uuid NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'unknown',
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metrics" ON public.metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own metrics" ON public.metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own metrics" ON public.metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own metrics" ON public.metrics FOR DELETE USING (auth.uid() = user_id);

-- 2. metric_targets table
CREATE TABLE public.metric_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  metric_id uuid NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  period text NOT NULL,
  target_value numeric NOT NULL,
  target_note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metric_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metric_targets" ON public.metric_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own metric_targets" ON public.metric_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own metric_targets" ON public.metric_targets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own metric_targets" ON public.metric_targets FOR DELETE USING (auth.uid() = user_id);

-- 3. metric_entries table
CREATE TABLE public.metric_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  metric_id uuid NOT NULL REFERENCES public.metrics(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  value numeric NOT NULL,
  note text NULL,
  source_note_override text NULL,
  confidence_override text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metric_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metric_entries" ON public.metric_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own metric_entries" ON public.metric_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own metric_entries" ON public.metric_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own metric_entries" ON public.metric_entries FOR DELETE USING (auth.uid() = user_id);

-- 4. Trigger to auto-update metrics.last_updated_at on new entries
CREATE OR REPLACE FUNCTION public.update_metric_last_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.metrics SET last_updated_at = now() WHERE id = NEW.metric_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER metric_entry_update_last_updated
AFTER INSERT ON public.metric_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_metric_last_updated();
