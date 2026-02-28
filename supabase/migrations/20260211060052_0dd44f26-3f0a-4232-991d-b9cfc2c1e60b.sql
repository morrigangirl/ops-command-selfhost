
-- Create people table
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  manager_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  last_1on1 DATE,
  last_strategic_deep_dive DATE,
  last_human_checkin DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  problem_statement TEXT NOT NULL DEFAULT '',
  strategic_goal TEXT NOT NULL DEFAULT '',
  success_metric TEXT NOT NULL DEFAULT '',
  owner_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
  risk TEXT NOT NULL DEFAULT 'medium' CHECK (risk IN ('low', 'medium', 'high')),
  review_cadence TEXT NOT NULL DEFAULT 'biweekly' CHECK (review_cadence IN ('weekly', 'biweekly', 'monthly')),
  target_date DATE NOT NULL,
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create review_entries table
CREATE TABLE public.review_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_entries ENABLE ROW LEVEL SECURITY;

-- People policies
CREATE POLICY "Users can view their own people" ON public.people FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own people" ON public.people FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own people" ON public.people FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own people" ON public.people FOR DELETE USING (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Review entries policies
CREATE POLICY "Users can view their own review entries" ON public.review_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own review entries" ON public.review_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own review entries" ON public.review_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own review entries" ON public.review_entries FOR DELETE USING (auth.uid() = user_id);
