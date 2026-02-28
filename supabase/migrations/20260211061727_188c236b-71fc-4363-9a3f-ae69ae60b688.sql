
-- Add default cadence fields to people table
ALTER TABLE public.people
  ADD COLUMN default_1on1_cadence_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN default_strategy_cadence_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN default_checkin_cadence_days INTEGER NOT NULL DEFAULT 14;
