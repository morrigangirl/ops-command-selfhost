
-- Add external_ref, risk_statement, phase, tags to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS external_ref TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS risk_statement TEXT NOT NULL DEFAULT '';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS phase TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Add external_ref, lead_id to workstreams
ALTER TABLE public.workstreams ADD COLUMN IF NOT EXISTS external_ref TEXT;
ALTER TABLE public.workstreams ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.people(id) ON DELETE SET NULL;

-- Add external_ref to programs
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS external_ref TEXT;
