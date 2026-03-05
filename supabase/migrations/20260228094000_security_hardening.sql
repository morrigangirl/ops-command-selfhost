-- Security hardening: enforce cross-table tenant integrity + daily token quotas

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.review_entries re
  JOIN public.projects p ON p.id = re.project_id
  WHERE re.user_id <> p.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: review_entries.project_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.workstreams ws
  JOIN public.programs pg ON pg.id = ws.program_id
  WHERE ws.user_id <> pg.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: workstreams.program_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.projects pr
  JOIN public.workstreams ws ON ws.id = pr.workstream_id
  WHERE pr.workstream_id IS NOT NULL AND pr.user_id <> ws.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: projects.workstream_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.projects pr
  JOIN public.people pe ON pe.id = pr.owner_id
  WHERE pr.owner_id IS NOT NULL AND pr.user_id <> pe.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: projects.owner_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.milestones ms
  JOIN public.projects pr ON pr.id = ms.project_id
  WHERE ms.user_id <> pr.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: milestones.project_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.work_items wi
  JOIN public.projects pr ON pr.id = wi.project_id
  WHERE wi.user_id <> pr.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: work_items.project_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.work_items wi
  JOIN public.milestones ms ON ms.id = wi.milestone_id
  WHERE wi.milestone_id IS NOT NULL AND wi.user_id <> ms.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: work_items.milestone_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.work_items wi
  JOIN public.people pe ON pe.id = wi.assignee_id
  WHERE wi.assignee_id IS NOT NULL AND wi.user_id <> pe.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: work_items.assignee_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.metric_targets mt
  JOIN public.metrics m ON m.id = mt.metric_id
  WHERE mt.user_id <> m.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: metric_targets.metric_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.metric_entries me
  JOIN public.metrics m ON m.id = me.metric_id
  WHERE me.user_id <> m.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: metric_entries.metric_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.metrics m
  JOIN public.people pe ON pe.id = m.owner_id
  WHERE m.owner_id IS NOT NULL AND m.user_id <> pe.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: metrics.owner_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.metrics m
  JOIN public.projects pr ON pr.id = m.related_project_id
  WHERE m.related_project_id IS NOT NULL AND m.user_id <> pr.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: metrics.related_project_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.meetings mt
  JOIN public.people pe ON pe.id = mt.person_id
  WHERE mt.user_id <> pe.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: meetings.person_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.meeting_action_items mai
  JOIN public.meetings mt ON mt.id = mai.meeting_id
  WHERE mai.user_id <> mt.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: meeting_action_items.meeting_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.meeting_action_items mai
  JOIN public.projects pr ON pr.id = mai.project_id
  WHERE mai.project_id IS NOT NULL AND mai.user_id <> pr.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: meeting_action_items.project_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.meeting_action_items mai
  JOIN public.people pe ON pe.id = mai.owner_id
  WHERE mai.owner_id IS NOT NULL AND mai.user_id <> pe.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: meeting_action_items.owner_id (% rows)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.meeting_decisions md
  JOIN public.meetings mt ON mt.id = md.meeting_id
  WHERE md.user_id <> mt.user_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cross-tenant integrity violation: meeting_decisions.meeting_id (% rows)', v_count;
  END IF;
END;
$$;

-- projects
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND (owner_id IS NULL OR EXISTS (
      SELECT 1 FROM public.people pe
      WHERE pe.id = owner_id
        AND pe.user_id = auth.uid()
    ))
    AND (workstream_id IS NULL OR EXISTS (
      SELECT 1 FROM public.workstreams ws
      WHERE ws.id = workstream_id
        AND ws.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND (owner_id IS NULL OR EXISTS (
      SELECT 1 FROM public.people pe
      WHERE pe.id = owner_id
        AND pe.user_id = auth.uid()
    ))
    AND (workstream_id IS NULL OR EXISTS (
      SELECT 1 FROM public.workstreams ws
      WHERE ws.id = workstream_id
        AND ws.user_id = auth.uid()
    ))
  );

-- review_entries
DROP POLICY IF EXISTS "Users can insert their own review entries" ON public.review_entries;
CREATE POLICY "Users can insert their own review entries" ON public.review_entries FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
        AND pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own review entries" ON public.review_entries;
CREATE POLICY "Users can update their own review entries" ON public.review_entries FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
        AND pr.user_id = auth.uid()
    )
  );

-- workstreams
DROP POLICY IF EXISTS "Users can insert their own workstreams" ON public.workstreams;
CREATE POLICY "Users can insert their own workstreams" ON public.workstreams FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.programs pg
      WHERE pg.id = program_id
        AND pg.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own workstreams" ON public.workstreams;
CREATE POLICY "Users can update their own workstreams" ON public.workstreams FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.programs pg
      WHERE pg.id = program_id
        AND pg.user_id = auth.uid()
    )
  );

-- milestones
DROP POLICY IF EXISTS "Users can insert their own milestones" ON public.milestones;
CREATE POLICY "Users can insert their own milestones" ON public.milestones FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
        AND pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own milestones" ON public.milestones;
CREATE POLICY "Users can update their own milestones" ON public.milestones FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
        AND pr.user_id = auth.uid()
    )
  );

-- work_items
DROP POLICY IF EXISTS "Users can insert their own work_items" ON public.work_items;
CREATE POLICY "Users can insert their own work_items" ON public.work_items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
        AND pr.user_id = auth.uid()
    )
    AND (milestone_id IS NULL OR EXISTS (
      SELECT 1 FROM public.milestones ms
      WHERE ms.id = milestone_id
        AND ms.user_id = auth.uid()
    ))
    AND (assignee_id IS NULL OR EXISTS (
      SELECT 1 FROM public.people pe
      WHERE pe.id = assignee_id
        AND pe.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can update their own work_items" ON public.work_items;
CREATE POLICY "Users can update their own work_items" ON public.work_items FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
        AND pr.user_id = auth.uid()
    )
    AND (milestone_id IS NULL OR EXISTS (
      SELECT 1 FROM public.milestones ms
      WHERE ms.id = milestone_id
        AND ms.user_id = auth.uid()
    ))
    AND (assignee_id IS NULL OR EXISTS (
      SELECT 1 FROM public.people pe
      WHERE pe.id = assignee_id
        AND pe.user_id = auth.uid()
    ))
  );

-- metrics
DROP POLICY IF EXISTS "Users can insert their own metrics" ON public.metrics;
CREATE POLICY "Users can insert their own metrics" ON public.metrics FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND (owner_id IS NULL OR EXISTS (
      SELECT 1 FROM public.people pe
      WHERE pe.id = owner_id
        AND pe.user_id = auth.uid()
    ))
    AND (related_project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = related_project_id
        AND pr.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can update their own metrics" ON public.metrics;
CREATE POLICY "Users can update their own metrics" ON public.metrics FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND (owner_id IS NULL OR EXISTS (
      SELECT 1 FROM public.people pe
      WHERE pe.id = owner_id
        AND pe.user_id = auth.uid()
    ))
    AND (related_project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = related_project_id
        AND pr.user_id = auth.uid()
    ))
  );

-- metric_targets
DROP POLICY IF EXISTS "Users can insert their own metric_targets" ON public.metric_targets;
CREATE POLICY "Users can insert their own metric_targets" ON public.metric_targets FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.metrics m
      WHERE m.id = metric_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own metric_targets" ON public.metric_targets;
CREATE POLICY "Users can update their own metric_targets" ON public.metric_targets FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.metrics m
      WHERE m.id = metric_id
        AND m.user_id = auth.uid()
    )
  );

-- metric_entries
DROP POLICY IF EXISTS "Users can insert their own metric_entries" ON public.metric_entries;
CREATE POLICY "Users can insert their own metric_entries" ON public.metric_entries FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.metrics m
      WHERE m.id = metric_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own metric_entries" ON public.metric_entries;
CREATE POLICY "Users can update their own metric_entries" ON public.metric_entries FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.metrics m
      WHERE m.id = metric_id
        AND m.user_id = auth.uid()
    )
  );

-- meetings
DROP POLICY IF EXISTS "Users can insert their own meetings" ON public.meetings;
CREATE POLICY "Users can insert their own meetings" ON public.meetings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.people pe
      WHERE pe.id = person_id
        AND pe.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own meetings" ON public.meetings;
CREATE POLICY "Users can update their own meetings" ON public.meetings FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.people pe
      WHERE pe.id = person_id
        AND pe.user_id = auth.uid()
    )
  );

-- meeting_action_items
DROP POLICY IF EXISTS "Users can insert their own meeting_action_items" ON public.meeting_action_items;
CREATE POLICY "Users can insert their own meeting_action_items" ON public.meeting_action_items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.meetings mt
      WHERE mt.id = meeting_id
        AND mt.user_id = auth.uid()
    )
    AND (project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
        AND pr.user_id = auth.uid()
    ))
    AND (owner_id IS NULL OR EXISTS (
      SELECT 1 FROM public.people pe
      WHERE pe.id = owner_id
        AND pe.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can update their own meeting_action_items" ON public.meeting_action_items;
CREATE POLICY "Users can update their own meeting_action_items" ON public.meeting_action_items FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.meetings mt
      WHERE mt.id = meeting_id
        AND mt.user_id = auth.uid()
    )
    AND (project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
        AND pr.user_id = auth.uid()
    ))
    AND (owner_id IS NULL OR EXISTS (
      SELECT 1 FROM public.people pe
      WHERE pe.id = owner_id
        AND pe.user_id = auth.uid()
    ))
  );

-- meeting_decisions
DROP POLICY IF EXISTS "Users can insert their own meeting_decisions" ON public.meeting_decisions;
CREATE POLICY "Users can insert their own meeting_decisions" ON public.meeting_decisions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.meetings mt
      WHERE mt.id = meeting_id
        AND mt.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own meeting_decisions" ON public.meeting_decisions;
CREATE POLICY "Users can update their own meeting_decisions" ON public.meeting_decisions FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (
      SELECT 1 FROM public.meetings mt
      WHERE mt.id = meeting_id
        AND mt.user_id = auth.uid()
    )
  );

-- Daily token quota guard used by edge functions
CREATE OR REPLACE FUNCTION public.check_daily_token_quota(
  p_user_id uuid,
  p_function_name text,
  p_max_tokens integer DEFAULT 500000,
  p_requested_tokens integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used_tokens bigint;
BEGIN
  SELECT COALESCE(SUM(total_tokens), 0)
  INTO v_used_tokens
  FROM public.token_usage
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND created_at >= date_trunc('day', now());

  RETURN (v_used_tokens + GREATEST(p_requested_tokens, 0)) <= p_max_tokens;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_daily_token_quota(uuid, text, integer, integer) FROM public;
REVOKE EXECUTE ON FUNCTION public.check_daily_token_quota(uuid, text, integer, integer) FROM authenticated;
