
-- ── meetings ──
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  type text NOT NULL,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  agenda text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meetings" ON public.meetings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meetings" ON public.meetings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meetings" ON public.meetings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meetings" ON public.meetings FOR DELETE USING (auth.uid() = user_id);

-- ── meeting_action_items ──
CREATE TABLE public.meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  owner_id uuid NULL REFERENCES public.people(id) ON DELETE SET NULL,
  due_date date NULL,
  project_id uuid NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meeting_action_items" ON public.meeting_action_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meeting_action_items" ON public.meeting_action_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meeting_action_items" ON public.meeting_action_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meeting_action_items" ON public.meeting_action_items FOR DELETE USING (auth.uid() = user_id);

-- ── meeting_decisions ──
CREATE TABLE public.meeting_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meeting_decisions" ON public.meeting_decisions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meeting_decisions" ON public.meeting_decisions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meeting_decisions" ON public.meeting_decisions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meeting_decisions" ON public.meeting_decisions FOR DELETE USING (auth.uid() = user_id);
