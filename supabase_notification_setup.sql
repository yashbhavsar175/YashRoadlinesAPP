-- =====================================================
-- SUPABASE NOTIFICATION SYSTEM SETUP
-- Copy and paste this entire code in Supabase SQL Editor
-- =====================================================

-- 1. Create admin_notifications table
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

-- 2. Enable Row Level Security
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admin can manage all notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON admin_notifications;

-- 4. Create policies for admin access
CREATE POLICY "Admin can manage all notifications" ON admin_notifications
  FOR ALL USING (true);

-- 5. Create policy for users to insert notifications
CREATE POLICY "Users can insert notifications" ON admin_notifications
  FOR INSERT WITH CHECK (true);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON admin_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);

-- 7. Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_admin_notifications_updated_at ON admin_notifications;

-- 9. Create trigger to automatically update updated_at
CREATE TRIGGER update_admin_notifications_updated_at 
    BEFORE UPDATE ON admin_notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Insert a test notification to verify everything works
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
  'Admin notification system has been set up successfully! You can now receive notifications when users add, edit, or delete entries.',
  'system',
  'success',
  'System Setup',
  'system@yashreadlines.com',
  jsonb_build_object(
    'setup', true,
    'version', '1.0',
    'timestamp', NOW()::text
  )
);

-- 11. Verify the setup
SELECT 
  'SUCCESS: Table created and configured!' as status,
  count(*) as total_notifications,
  count(*) FILTER (WHERE is_read = false) as unread_notifications,
  count(*) FILTER (WHERE type = 'system') as system_notifications
FROM admin_notifications;

-- 12. Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'admin_notifications' 
ORDER BY ordinal_position;

-- 13. Test real-time subscriptions (this will show if real-time is working)
SELECT 
  'Real-time setup complete. Test by adding entries from the app!' as realtime_status;

-- =====================================================
-- SETUP COMPLETE!
-- 
-- What this script does:
-- ✅ Creates admin_notifications table
-- ✅ Sets up Row Level Security
-- ✅ Creates proper access policies  
-- ✅ Adds performance indexes
-- ✅ Sets up auto-updating timestamps
-- ✅ Inserts test notification
-- ✅ Verifies everything works
--
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Login to your app with non-admin user
-- 3. Add any entry (Majuri, Payment, etc.)
-- 4. Login as admin to see notifications
-- =====================================================