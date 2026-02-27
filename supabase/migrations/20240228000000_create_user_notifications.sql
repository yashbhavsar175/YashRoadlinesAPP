-- Create user_notifications table for real-time user notifications
-- This table stores notifications sent to individual users

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS public.user_notifications CASCADE;

-- Create the table with correct schema
CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('add', 'edit', 'delete', 'info', 'warning', 'error')),
  metadata JSONB DEFAULT '{}'::jsonb,
  read_status BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_user_notifications_recipient_id ON public.user_notifications(recipient_id);
CREATE INDEX idx_user_notifications_created_at ON public.user_notifications(created_at DESC);
CREATE INDEX idx_user_notifications_read_status ON public.user_notifications(read_status);
CREATE INDEX idx_user_notifications_type ON public.user_notifications(type);

-- Enable Row Level Security
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.user_notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

-- RLS Policy: Authenticated users can insert notifications (for system/admin notifications)
CREATE POLICY "Authenticated users can insert notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.user_notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- RLS Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.user_notifications
  FOR DELETE
  USING (auth.uid() = recipient_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_user_notifications_updated_at
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_notifications_updated_at();

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- Add comment to table
COMMENT ON TABLE public.user_notifications IS 'Stores real-time notifications for individual users';
