
-- Add soft-delete column to programs, workstreams, projects
ALTER TABLE public.programs ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.workstreams ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.projects ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for efficient filtering of active items and purge queries
CREATE INDEX idx_programs_deleted_at ON public.programs (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_workstreams_deleted_at ON public.workstreams (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_projects_deleted_at ON public.projects (deleted_at) WHERE deleted_at IS NOT NULL;

-- Function to auto-purge items deleted more than 7 days ago
CREATE OR REPLACE FUNCTION public.purge_soft_deleted_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.projects WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
  DELETE FROM public.workstreams WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
  DELETE FROM public.programs WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
END;
$$;
