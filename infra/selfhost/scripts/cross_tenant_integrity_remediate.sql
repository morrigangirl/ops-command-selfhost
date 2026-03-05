-- Quarantine + delete cross-tenant relational integrity violations.
-- Destructive: run only after reviewing cross_tenant_integrity_report.sql output.

CREATE TABLE IF NOT EXISTS public.cross_tenant_integrity_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  row_id uuid NOT NULL,
  reason text NOT NULL,
  payload jsonb NOT NULL,
  quarantined_at timestamptz NOT NULL DEFAULT now()
);

-- review_entries.project_id
INSERT INTO public.cross_tenant_integrity_quarantine (table_name, row_id, reason, payload)
SELECT 'review_entries', re.id, 'project_id points to different tenant', to_jsonb(re)
FROM public.review_entries re
JOIN public.projects p ON p.id = re.project_id
WHERE re.user_id <> p.user_id
ON CONFLICT DO NOTHING;
DELETE FROM public.review_entries re
USING public.projects p
WHERE p.id = re.project_id AND re.user_id <> p.user_id;

-- workstreams.program_id
INSERT INTO public.cross_tenant_integrity_quarantine (table_name, row_id, reason, payload)
SELECT 'workstreams', ws.id, 'program_id points to different tenant', to_jsonb(ws)
FROM public.workstreams ws
JOIN public.programs pg ON pg.id = ws.program_id
WHERE ws.user_id <> pg.user_id
ON CONFLICT DO NOTHING;
DELETE FROM public.workstreams ws
USING public.programs pg
WHERE pg.id = ws.program_id AND ws.user_id <> pg.user_id;

-- projects owner/workstream mismatches: nullify references, keep project row
UPDATE public.projects pr
SET owner_id = NULL
WHERE owner_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.people pe
    WHERE pe.id = pr.owner_id
      AND pe.user_id <> pr.user_id
  );

UPDATE public.projects pr
SET workstream_id = NULL
WHERE workstream_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workstreams ws
    WHERE ws.id = pr.workstream_id
      AND ws.user_id <> pr.user_id
  );

-- milestones.project_id
INSERT INTO public.cross_tenant_integrity_quarantine (table_name, row_id, reason, payload)
SELECT 'milestones', ms.id, 'project_id points to different tenant', to_jsonb(ms)
FROM public.milestones ms
JOIN public.projects pr ON pr.id = ms.project_id
WHERE ms.user_id <> pr.user_id
ON CONFLICT DO NOTHING;
DELETE FROM public.milestones ms
USING public.projects pr
WHERE pr.id = ms.project_id AND ms.user_id <> pr.user_id;

-- work_items.project_id / milestone_id / assignee_id
INSERT INTO public.cross_tenant_integrity_quarantine (table_name, row_id, reason, payload)
SELECT 'work_items', wi.id, 'project_id points to different tenant', to_jsonb(wi)
FROM public.work_items wi
JOIN public.projects pr ON pr.id = wi.project_id
WHERE wi.user_id <> pr.user_id
ON CONFLICT DO NOTHING;
DELETE FROM public.work_items wi
USING public.projects pr
WHERE pr.id = wi.project_id AND wi.user_id <> pr.user_id;

UPDATE public.work_items wi
SET milestone_id = NULL
WHERE milestone_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.milestones ms
    WHERE ms.id = wi.milestone_id
      AND ms.user_id <> wi.user_id
  );

UPDATE public.work_items wi
SET assignee_id = NULL
WHERE assignee_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.people pe
    WHERE pe.id = wi.assignee_id
      AND pe.user_id <> wi.user_id
  );

-- metric_targets / metric_entries
INSERT INTO public.cross_tenant_integrity_quarantine (table_name, row_id, reason, payload)
SELECT 'metric_targets', mt.id, 'metric_id points to different tenant', to_jsonb(mt)
FROM public.metric_targets mt
JOIN public.metrics m ON m.id = mt.metric_id
WHERE mt.user_id <> m.user_id
ON CONFLICT DO NOTHING;
DELETE FROM public.metric_targets mt
USING public.metrics m
WHERE m.id = mt.metric_id AND mt.user_id <> m.user_id;

INSERT INTO public.cross_tenant_integrity_quarantine (table_name, row_id, reason, payload)
SELECT 'metric_entries', me.id, 'metric_id points to different tenant', to_jsonb(me)
FROM public.metric_entries me
JOIN public.metrics m ON m.id = me.metric_id
WHERE me.user_id <> m.user_id
ON CONFLICT DO NOTHING;
DELETE FROM public.metric_entries me
USING public.metrics m
WHERE m.id = me.metric_id AND me.user_id <> m.user_id;

-- metrics owner/project mismatches: nullify references
UPDATE public.metrics m
SET owner_id = NULL
WHERE owner_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.people pe
    WHERE pe.id = m.owner_id
      AND pe.user_id <> m.user_id
  );

UPDATE public.metrics m
SET related_project_id = NULL
WHERE related_project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.projects pr
    WHERE pr.id = m.related_project_id
      AND pr.user_id <> m.user_id
  );

-- meetings.person_id
INSERT INTO public.cross_tenant_integrity_quarantine (table_name, row_id, reason, payload)
SELECT 'meetings', mt.id, 'person_id points to different tenant', to_jsonb(mt)
FROM public.meetings mt
JOIN public.people pe ON pe.id = mt.person_id
WHERE mt.user_id <> pe.user_id
ON CONFLICT DO NOTHING;
DELETE FROM public.meetings mt
USING public.people pe
WHERE pe.id = mt.person_id AND mt.user_id <> pe.user_id;

-- meeting_action_items and meeting_decisions mismatches
INSERT INTO public.cross_tenant_integrity_quarantine (table_name, row_id, reason, payload)
SELECT 'meeting_action_items', mai.id, 'meeting_id points to different tenant', to_jsonb(mai)
FROM public.meeting_action_items mai
JOIN public.meetings mt ON mt.id = mai.meeting_id
WHERE mai.user_id <> mt.user_id
ON CONFLICT DO NOTHING;
DELETE FROM public.meeting_action_items mai
USING public.meetings mt
WHERE mt.id = mai.meeting_id AND mai.user_id <> mt.user_id;

UPDATE public.meeting_action_items mai
SET project_id = NULL
WHERE project_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.projects pr
    WHERE pr.id = mai.project_id
      AND pr.user_id <> mai.user_id
  );

UPDATE public.meeting_action_items mai
SET owner_id = NULL
WHERE owner_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.people pe
    WHERE pe.id = mai.owner_id
      AND pe.user_id <> mai.user_id
  );

INSERT INTO public.cross_tenant_integrity_quarantine (table_name, row_id, reason, payload)
SELECT 'meeting_decisions', md.id, 'meeting_id points to different tenant', to_jsonb(md)
FROM public.meeting_decisions md
JOIN public.meetings mt ON mt.id = md.meeting_id
WHERE md.user_id <> mt.user_id
ON CONFLICT DO NOTHING;
DELETE FROM public.meeting_decisions md
USING public.meetings mt
WHERE mt.id = md.meeting_id AND md.user_id <> mt.user_id;
