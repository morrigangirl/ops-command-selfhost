
-- Create trusted_devices table
CREATE TABLE public.trusted_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'Unknown Device',
  trusted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trusted devices" ON public.trusted_devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own trusted devices" ON public.trusted_devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trusted devices" ON public.trusted_devices FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_trusted_devices_user_fingerprint ON public.trusted_devices (user_id, device_fingerprint);
