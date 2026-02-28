
-- 1. Programs table
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_date DATE,
  target_end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own programs" ON public.programs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own programs" ON public.programs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own programs" ON public.programs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own programs" ON public.programs FOR DELETE USING (auth.uid() = user_id);

-- 2. Workstreams table
CREATE TABLE public.workstreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workstreams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own workstreams" ON public.workstreams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own workstreams" ON public.workstreams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workstreams" ON public.workstreams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workstreams" ON public.workstreams FOR DELETE USING (auth.uid() = user_id);

-- 3. Add workstream_id to projects
ALTER TABLE public.projects ADD COLUMN workstream_id UUID REFERENCES public.workstreams(id) ON DELETE SET NULL;

-- 4. Milestones table
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own milestones" ON public.milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own milestones" ON public.milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own milestones" ON public.milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own milestones" ON public.milestones FOR DELETE USING (auth.uid() = user_id);

-- 5. Work items table (epics, tasks, subtasks)
CREATE TABLE public.work_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.work_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'task',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  assignee_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  due_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own work_items" ON public.work_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own work_items" ON public.work_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own work_items" ON public.work_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own work_items" ON public.work_items FOR DELETE USING (auth.uid() = user_id);
