
-- Security definer function: if user has verified MFA factors, require aal2 session
CREATE OR REPLACE FUNCTION public.meets_mfa_requirement()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM auth.mfa_factors
      WHERE auth.mfa_factors.user_id = auth.uid()
        AND status = 'verified'
    )
    THEN (auth.jwt() ->> 'aal') = 'aal2'
    ELSE true
  END
$$;

-- Now update all core table SELECT/INSERT/UPDATE/DELETE policies to include MFA check.
-- We drop and recreate each policy.

-- === projects ===
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === people ===
DROP POLICY IF EXISTS "Users can view their own people" ON public.people;
CREATE POLICY "Users can view their own people" ON public.people FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own people" ON public.people;
CREATE POLICY "Users can insert their own people" ON public.people FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own people" ON public.people;
CREATE POLICY "Users can update their own people" ON public.people FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own people" ON public.people;
CREATE POLICY "Users can delete their own people" ON public.people FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === metrics ===
DROP POLICY IF EXISTS "Users can view their own metrics" ON public.metrics;
CREATE POLICY "Users can view their own metrics" ON public.metrics FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own metrics" ON public.metrics;
CREATE POLICY "Users can insert their own metrics" ON public.metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own metrics" ON public.metrics;
CREATE POLICY "Users can update their own metrics" ON public.metrics FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own metrics" ON public.metrics;
CREATE POLICY "Users can delete their own metrics" ON public.metrics FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === metric_entries ===
DROP POLICY IF EXISTS "Users can view their own metric_entries" ON public.metric_entries;
CREATE POLICY "Users can view their own metric_entries" ON public.metric_entries FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own metric_entries" ON public.metric_entries;
CREATE POLICY "Users can insert their own metric_entries" ON public.metric_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own metric_entries" ON public.metric_entries;
CREATE POLICY "Users can update their own metric_entries" ON public.metric_entries FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own metric_entries" ON public.metric_entries;
CREATE POLICY "Users can delete their own metric_entries" ON public.metric_entries FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === metric_targets ===
DROP POLICY IF EXISTS "Users can view their own metric_targets" ON public.metric_targets;
CREATE POLICY "Users can view their own metric_targets" ON public.metric_targets FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own metric_targets" ON public.metric_targets;
CREATE POLICY "Users can insert their own metric_targets" ON public.metric_targets FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own metric_targets" ON public.metric_targets;
CREATE POLICY "Users can update their own metric_targets" ON public.metric_targets FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own metric_targets" ON public.metric_targets;
CREATE POLICY "Users can delete their own metric_targets" ON public.metric_targets FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === milestones ===
DROP POLICY IF EXISTS "Users can view their own milestones" ON public.milestones;
CREATE POLICY "Users can view their own milestones" ON public.milestones FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own milestones" ON public.milestones;
CREATE POLICY "Users can insert their own milestones" ON public.milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own milestones" ON public.milestones;
CREATE POLICY "Users can update their own milestones" ON public.milestones FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own milestones" ON public.milestones;
CREATE POLICY "Users can delete their own milestones" ON public.milestones FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === work_items ===
DROP POLICY IF EXISTS "Users can view their own work_items" ON public.work_items;
CREATE POLICY "Users can view their own work_items" ON public.work_items FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own work_items" ON public.work_items;
CREATE POLICY "Users can insert their own work_items" ON public.work_items FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own work_items" ON public.work_items;
CREATE POLICY "Users can update their own work_items" ON public.work_items FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own work_items" ON public.work_items;
CREATE POLICY "Users can delete their own work_items" ON public.work_items FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === meetings ===
DROP POLICY IF EXISTS "Users can view their own meetings" ON public.meetings;
CREATE POLICY "Users can view their own meetings" ON public.meetings FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own meetings" ON public.meetings;
CREATE POLICY "Users can insert their own meetings" ON public.meetings FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own meetings" ON public.meetings;
CREATE POLICY "Users can update their own meetings" ON public.meetings FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own meetings" ON public.meetings;
CREATE POLICY "Users can delete their own meetings" ON public.meetings FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === meeting_action_items ===
DROP POLICY IF EXISTS "Users can view their own meeting_action_items" ON public.meeting_action_items;
CREATE POLICY "Users can view their own meeting_action_items" ON public.meeting_action_items FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own meeting_action_items" ON public.meeting_action_items;
CREATE POLICY "Users can insert their own meeting_action_items" ON public.meeting_action_items FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own meeting_action_items" ON public.meeting_action_items;
CREATE POLICY "Users can update their own meeting_action_items" ON public.meeting_action_items FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own meeting_action_items" ON public.meeting_action_items;
CREATE POLICY "Users can delete their own meeting_action_items" ON public.meeting_action_items FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === meeting_decisions ===
DROP POLICY IF EXISTS "Users can view their own meeting_decisions" ON public.meeting_decisions;
CREATE POLICY "Users can view their own meeting_decisions" ON public.meeting_decisions FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own meeting_decisions" ON public.meeting_decisions;
CREATE POLICY "Users can insert their own meeting_decisions" ON public.meeting_decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own meeting_decisions" ON public.meeting_decisions;
CREATE POLICY "Users can update their own meeting_decisions" ON public.meeting_decisions FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own meeting_decisions" ON public.meeting_decisions;
CREATE POLICY "Users can delete their own meeting_decisions" ON public.meeting_decisions FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === review_entries ===
DROP POLICY IF EXISTS "Users can view their own review entries" ON public.review_entries;
CREATE POLICY "Users can view their own review entries" ON public.review_entries FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own review entries" ON public.review_entries;
CREATE POLICY "Users can insert their own review entries" ON public.review_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own review entries" ON public.review_entries;
CREATE POLICY "Users can update their own review entries" ON public.review_entries FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own review entries" ON public.review_entries;
CREATE POLICY "Users can delete their own review entries" ON public.review_entries FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === programs ===
DROP POLICY IF EXISTS "Users can view their own programs" ON public.programs;
CREATE POLICY "Users can view their own programs" ON public.programs FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own programs" ON public.programs;
CREATE POLICY "Users can insert their own programs" ON public.programs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own programs" ON public.programs;
CREATE POLICY "Users can update their own programs" ON public.programs FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own programs" ON public.programs;
CREATE POLICY "Users can delete their own programs" ON public.programs FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === workstreams ===
DROP POLICY IF EXISTS "Users can view their own workstreams" ON public.workstreams;
CREATE POLICY "Users can view their own workstreams" ON public.workstreams FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own workstreams" ON public.workstreams;
CREATE POLICY "Users can insert their own workstreams" ON public.workstreams FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own workstreams" ON public.workstreams;
CREATE POLICY "Users can update their own workstreams" ON public.workstreams FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own workstreams" ON public.workstreams;
CREATE POLICY "Users can delete their own workstreams" ON public.workstreams FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === chat_sessions ===
DROP POLICY IF EXISTS "Users can select own sessions" ON public.chat_sessions;
CREATE POLICY "Users can select own sessions" ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.chat_sessions;
CREATE POLICY "Users can insert own sessions" ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update own sessions" ON public.chat_sessions;
CREATE POLICY "Users can update own sessions" ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.chat_sessions;
CREATE POLICY "Users can delete own sessions" ON public.chat_sessions FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === chat_messages ===
DROP POLICY IF EXISTS "Users can select own messages" ON public.chat_messages;
CREATE POLICY "Users can select own messages" ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (SELECT 1 FROM public.chat_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;
CREATE POLICY "Users can update own messages" ON public.chat_messages FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement())
  WITH CHECK (
    auth.uid() = user_id
    AND public.meets_mfa_requirement()
    AND EXISTS (SELECT 1 FROM public.chat_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === profiles (SELECT/INSERT/UPDATE only, no DELETE policy exists) ===
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

-- === trusted_devices (keep existing aal2 INSERT check, add MFA to SELECT/DELETE) ===
DROP POLICY IF EXISTS "Users can view their own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can view their own trusted devices" ON public.trusted_devices FOR SELECT
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());

DROP POLICY IF EXISTS "Users can delete their own trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can delete their own trusted devices" ON public.trusted_devices FOR DELETE
  USING (auth.uid() = user_id AND public.meets_mfa_requirement());
-- INSERT policy for trusted_devices already requires aal2 explicitly, leave as-is
