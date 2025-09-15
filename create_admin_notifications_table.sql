-- Create admin_notifications table for the notification system
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('add', 'edit', 'delete', 'system')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'success', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  user_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access (allows all operations)
CREATE POLICY "Admin can manage all notifications" ON admin_notifications
  FOR ALL USING (true);

-- Create policy for users to insert notifications
CREATE POLICY "Users can insert notifications" ON admin_notifications
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON admin_notifications(user_id);

-- Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_admin_notifications_updated_at 
    BEFORE UPDATE ON admin_notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a test notification to verify the table works
INSERT INTO admin_notifications (
  title, 
  message, 
  type, 
  severity, 
  user_name, 
  user_id, 
  metadata
) VALUES (
  '🎉 Notification System Ready',
  'Admin notification system has been set up successfully!',
  'system',
  'success',
  'System',
  'system@yashreadlines.com',
  '{"setup": true, "version": "1.0"}'
);

-- Verify the table was created successfully
SELECT 'Table created successfully!' as status, count(*) as notification_count 
FROM admin_notifications;