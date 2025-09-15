-- Alternative Database Setup (if user_profiles table structure is different)
-- Run this SQL in your Supabase SQL Editor

-- First, check your existing table structure
-- Run this query to see your current user_profiles table:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_profiles';

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('add', 'edit', 'delete', 'system')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'success', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  user_name TEXT,
  user_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON admin_notifications(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid duplicate errors)
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON admin_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON admin_notifications;

-- Simple policies without user_profiles dependency (TEMPORARY)
-- These policies allow all authenticated users to manage notifications
-- You can modify these based on your actual user_profiles table structure

-- Allow authenticated users to view notifications (you can restrict this later)
CREATE POLICY "Authenticated users can view notifications" ON admin_notifications
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update notifications
CREATE POLICY "Authenticated users can update notifications" ON admin_notifications
FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete notifications
CREATE POLICY "Authenticated users can delete notifications" ON admin_notifications
FOR DELETE USING (auth.role() = 'authenticated');

-- System can insert notifications (for service functions)
CREATE POLICY "System can insert notifications" ON admin_notifications
FOR INSERT WITH CHECK (true);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admin_notifications_updated_at 
BEFORE UPDATE ON admin_notifications 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
INSERT INTO admin_notifications (title, message, type, severity, user_name, metadata) VALUES 
('System Startup', 'Notification system initialized successfully', 'system', 'success', 'System', '{"source": "initialization"}'),
('Test Notification', 'This is a test notification for admin', 'system', 'info', 'Test User', '{"test": true}');

-- Create a function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_notifications 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- IMPORTANT: After creating this, check your user_profiles table structure
-- Then modify the policies above to match your actual column names
-- For example, if your table has 'id' instead of 'user_id', update the policies accordingly

/*
-- Once you know your user_profiles structure, replace the above policies with proper ones:

-- Example if your user_profiles table has 'id' column:
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON admin_notifications;
CREATE POLICY "Admin can view all notifications" ON admin_notifications
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role = 'admin'
  )
);

-- Repeat for UPDATE and DELETE policies
*/
