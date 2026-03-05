CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  target_type text NULL,
  target_id uuid NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notes_target_pair_check CHECK ((target_type IS NULL) = (target_id IS NULL)),
  CONSTRAINT notes_target_type_check CHECK (
    target_type IN ('project', 'program', 'workstream', 'person', 'metric', 'meeting', 'milestone', 'work_item')
    OR target_type IS NULL
  )
);

CREATE OR REPLACE FUNCTION public.validate_note_target_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.target_type IS NULL AND NEW.target_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.target_type = 'project' THEN
    IF NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = NEW.target_id AND p.user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Invalid note target: project % not found for user %', NEW.target_id, NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.target_type = 'program' THEN
    IF NOT EXISTS (SELECT 1 FROM public.programs p WHERE p.id = NEW.target_id AND p.user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Invalid note target: program % not found for user %', NEW.target_id, NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.target_type = 'workstream' THEN
    IF NOT EXISTS (SELECT 1 FROM public.workstreams w WHERE w.id = NEW.target_id AND w.user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Invalid note target: workstream % not found for user %', NEW.target_id, NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.target_type = 'person' THEN
    IF NOT EXISTS (SELECT 1 FROM public.people p WHERE p.id = NEW.target_id AND p.user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Invalid note target: person % not found for user %', NEW.target_id, NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.target_type = 'metric' THEN
    IF NOT EXISTS (SELECT 1 FROM public.metrics m WHERE m.id = NEW.target_id AND m.user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Invalid note target: metric % not found for user %', NEW.target_id, NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.target_type = 'meeting' THEN
    IF NOT EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = NEW.target_id AND m.user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Invalid note target: meeting % not found for user %', NEW.target_id, NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.target_type = 'milestone' THEN
    IF NOT EXISTS (SELECT 1 FROM public.milestones m WHERE m.id = NEW.target_id AND m.user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Invalid note target: milestone % not found for user %', NEW.target_id, NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.target_type = 'work_item' THEN
    IF NOT EXISTS (SELECT 1 FROM public.work_items w WHERE w.id = NEW.target_id AND w.user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Invalid note target: work_item % not found for user %', NEW.target_id, NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid note target_type: %', NEW.target_type;
END;
$$;

CREATE TRIGGER notes_validate_target
BEFORE INSERT OR UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.validate_note_target_ownership();

CREATE TRIGGER notes_set_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own notes"
ON public.notes FOR SELECT
USING (auth.uid() = user_id AND public.meets_mfa_requirement());

CREATE POLICY "Users can insert own notes"
ON public.notes FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

CREATE POLICY "Users can update own notes"
ON public.notes FOR UPDATE
USING (auth.uid() = user_id AND public.meets_mfa_requirement())
WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

CREATE POLICY "Users can delete own notes"
ON public.notes FOR DELETE
USING (auth.uid() = user_id AND public.meets_mfa_requirement());

CREATE INDEX idx_notes_user_created_desc ON public.notes (user_id, created_at DESC);
CREATE INDEX idx_notes_user_target_created_desc ON public.notes (user_id, target_type, target_id, created_at DESC);
CREATE INDEX idx_notes_user_pinned_created_desc ON public.notes (user_id, is_pinned, created_at DESC) WHERE is_pinned = true;
