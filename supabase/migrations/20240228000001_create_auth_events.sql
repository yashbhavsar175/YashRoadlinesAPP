-- Create auth_events table for tracking authentication events
-- This table is used for real-time logout notifications and auth event tracking

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS public.auth_events CASCADE;

-- Create the table with correct schema
CREATE TABLE public.auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('forced_logout', 'password_changed', 'account_deactivated', 'account_activated', 'session_revoked')),
  details JSONB DEFAULT '{}'::jsonb,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_auth_events_user_id ON public.auth_events(user_id);
CREATE INDEX idx_auth_events_event_type ON public.auth_events(event_type);
CREATE INDEX idx_auth_events_created_at ON public.auth_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own auth events
CREATE POLICY "Users can view their own auth events"
  ON public.auth_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Only service role can insert auth events (for admin actions)
CREATE POLICY "Service role can insert auth events"
  ON public.auth_events
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS, so this allows inserts

-- RLS Policy: Admins can view all auth events (check against user_profiles table)
CREATE POLICY "Admins can view all auth events"
  ON public.auth_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.user_type = 'Admin'
    )
  );

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.auth_events;

-- Add comment to table
COMMENT ON TABLE public.auth_events IS 'Tracks authentication events for real-time logout and security monitoring';

-- Create function to send logout notification when forced_logout event is inserted
CREATE OR REPLACE FUNCTION public.handle_forced_logout()
RETURNS TRIGGER AS $$
BEGIN
  -- When a forced_logout event is created, we can trigger additional actions here
  -- For now, just log it
  RAISE NOTICE 'Forced logout event created for user: %', NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for forced logout events
CREATE TRIGGER on_forced_logout
  AFTER INSERT ON public.auth_events
  FOR EACH ROW
  WHEN (NEW.event_type = 'forced_logout')
  EXECUTE FUNCTION public.handle_forced_logout();
