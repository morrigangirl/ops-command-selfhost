-- Report cross-tenant relational integrity violations.
-- Safe/read-only.

SELECT 'review_entries.project_id' AS check_name, COUNT(*) AS violations
FROM public.review_entries re
JOIN public.projects p ON p.id = re.project_id
WHERE re.user_id <> p.user_id
UNION ALL
SELECT 'workstreams.program_id', COUNT(*)
FROM public.workstreams ws
JOIN public.programs pg ON pg.id = ws.program_id
WHERE ws.user_id <> pg.user_id
UNION ALL
SELECT 'projects.workstream_id', COUNT(*)
FROM public.projects pr
JOIN public.workstreams ws ON ws.id = pr.workstream_id
WHERE pr.workstream_id IS NOT NULL AND pr.user_id <> ws.user_id
UNION ALL
SELECT 'projects.owner_id', COUNT(*)
FROM public.projects pr
JOIN public.people pe ON pe.id = pr.owner_id
WHERE pr.owner_id IS NOT NULL AND pr.user_id <> pe.user_id
UNION ALL
SELECT 'milestones.project_id', COUNT(*)
FROM public.milestones ms
JOIN public.projects pr ON pr.id = ms.project_id
WHERE ms.user_id <> pr.user_id
UNION ALL
SELECT 'work_items.project_id', COUNT(*)
FROM public.work_items wi
JOIN public.projects pr ON pr.id = wi.project_id
WHERE wi.user_id <> pr.user_id
UNION ALL
SELECT 'work_items.milestone_id', COUNT(*)
FROM public.work_items wi
JOIN public.milestones ms ON ms.id = wi.milestone_id
WHERE wi.milestone_id IS NOT NULL AND wi.user_id <> ms.user_id
UNION ALL
SELECT 'work_items.assignee_id', COUNT(*)
FROM public.work_items wi
JOIN public.people pe ON pe.id = wi.assignee_id
WHERE wi.assignee_id IS NOT NULL AND wi.user_id <> pe.user_id
UNION ALL
SELECT 'metric_targets.metric_id', COUNT(*)
FROM public.metric_targets mt
JOIN public.metrics m ON m.id = mt.metric_id
WHERE mt.user_id <> m.user_id
UNION ALL
SELECT 'metric_entries.metric_id', COUNT(*)
FROM public.metric_entries me
JOIN public.metrics m ON m.id = me.metric_id
WHERE me.user_id <> m.user_id
UNION ALL
SELECT 'metrics.owner_id', COUNT(*)
FROM public.metrics m
JOIN public.people pe ON pe.id = m.owner_id
WHERE m.owner_id IS NOT NULL AND m.user_id <> pe.user_id
UNION ALL
SELECT 'metrics.related_project_id', COUNT(*)
FROM public.metrics m
JOIN public.projects pr ON pr.id = m.related_project_id
WHERE m.related_project_id IS NOT NULL AND m.user_id <> pr.user_id
UNION ALL
SELECT 'meetings.person_id', COUNT(*)
FROM public.meetings mt
JOIN public.people pe ON pe.id = mt.person_id
WHERE mt.user_id <> pe.user_id
UNION ALL
SELECT 'meeting_action_items.meeting_id', COUNT(*)
FROM public.meeting_action_items mai
JOIN public.meetings mt ON mt.id = mai.meeting_id
WHERE mai.user_id <> mt.user_id
UNION ALL
SELECT 'meeting_action_items.project_id', COUNT(*)
FROM public.meeting_action_items mai
JOIN public.projects pr ON pr.id = mai.project_id
WHERE mai.project_id IS NOT NULL AND mai.user_id <> pr.user_id
UNION ALL
SELECT 'meeting_action_items.owner_id', COUNT(*)
FROM public.meeting_action_items mai
JOIN public.people pe ON pe.id = mai.owner_id
WHERE mai.owner_id IS NOT NULL AND mai.user_id <> pe.user_id
UNION ALL
SELECT 'meeting_decisions.meeting_id', COUNT(*)
FROM public.meeting_decisions md
JOIN public.meetings mt ON mt.id = md.meeting_id
WHERE md.user_id <> mt.user_id
ORDER BY check_name;
