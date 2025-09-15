-- Enhanced Notification Database Setup for YashRoadlines
-- Run this in Supabase SQL Editor to ensure all notification features work

-- =====================================================
-- 1. CREATE ADMIN_NOTIFICATIONS TABLE (if not exists)
-- =====================================================
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

-- =====================================================
-- 2. CREATE DEVICE_TOKENS TABLE (for FCM tokens)
-- =====================================================
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safety: Ensure `user_email` column exists for environments that may have an older schema
-- This makes the script idempotent and prevents errors like: ERROR: 42703: column "user_email" does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'device_tokens' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE public.device_tokens ADD COLUMN IF NOT EXISTS user_email TEXT;
    RAISE NOTICE 'Added missing column device_tokens.user_email';
  END IF;
END
$$;

-- Safety: Ensure `is_active` column exists (some older schemas may not have it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'device_tokens' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.device_tokens ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'Added missing column device_tokens.is_active with default TRUE';
  END IF;
END
$$;

-- =====================================================
-- 3. CREATE NOTIFICATION_LOGS TABLE (for debugging)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL,
  recipient_email TEXT,
  title TEXT,
  message TEXT,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. DROP EXISTING POLICIES (to avoid conflicts)
-- =====================================================
DROP POLICY IF EXISTS "Admin can manage all notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admin can manage device tokens" ON device_tokens;
DROP POLICY IF EXISTS "Users can manage own tokens" ON device_tokens;
DROP POLICY IF EXISTS "Admin can view notification logs" ON notification_logs;

-- =====================================================
-- 6. CREATE POLICIES FOR ADMIN_NOTIFICATIONS
-- =====================================================
-- Admin can do everything
CREATE POLICY "Admin can manage all notifications" ON admin_notifications
  FOR ALL USING (true);

-- Users can insert notifications
CREATE POLICY "Users can insert notifications" ON admin_notifications
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 7. CREATE POLICIES FOR DEVICE_TOKENS
-- =====================================================
-- Admin can manage all tokens
CREATE POLICY "Admin can manage device tokens" ON device_tokens
  FOR ALL USING (true);

-- Users can manage their own tokens
DO $$
BEGIN
  -- Only create the policy if the device_tokens table has the user_email column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'device_tokens' AND column_name = 'user_email'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Users can manage own tokens" ON device_tokens
        FOR ALL USING ((auth.jwt() ->> 'email') = user_email);
    $sql$;
  ELSE
    RAISE NOTICE 'Skipping creation of policy "Users can manage own tokens" because device_tokens.user_email column not found.';
  END IF;
END
$$;

-- =====================================================
-- 8. CREATE POLICIES FOR NOTIFICATION_LOGS
-- =====================================================
-- Admin can view all logs
CREATE POLICY "Admin can view notification logs" ON notification_logs
  FOR SELECT USING (true);

-- System can insert logs
CREATE POLICY "System can insert logs" ON notification_logs
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON admin_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_email ON device_tokens(user_email);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_is_active ON device_tokens(is_active);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_success ON notification_logs(success);

-- =====================================================
-- 10. CREATE TRIGGER FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 11. CREATE TRIGGERS
-- =====================================================
-- Drop existing triggers
DROP TRIGGER IF EXISTS update_admin_notifications_updated_at ON admin_notifications;
DROP TRIGGER IF EXISTS update_device_tokens_updated_at ON device_tokens;

-- Create new triggers
CREATE TRIGGER update_admin_notifications_updated_at 
    BEFORE UPDATE ON admin_notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_tokens_updated_at 
    BEFORE UPDATE ON device_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. INSERT TEST NOTIFICATIONS
-- =====================================================
-- Clear existing test notifications
DELETE FROM admin_notifications WHERE user_id = 'system@yashreadlines.com';

-- Insert system setup notification
INSERT INTO admin_notifications (
  title, 
  message, 
  type, 
  severity, 
  user_name, 
  user_id, 
  metadata
) VALUES (
  '🎉 Enhanced Notification System Ready',
  'Complete notification system with FCM support has been set up successfully! You can now receive real-time notifications on your device.',
  'system',
  'success',
  'System Setup',
  'system@yashreadlines.com',
  jsonb_build_object(
    'setup', true,
    'version', '2.0',
    'features', jsonb_build_array('real_time', 'fcm_push', 'device_tokens'),
    'timestamp', NOW()::text
  )
);

-- Insert test notification for immediate testing
INSERT INTO admin_notifications (
  title, 
  message, 
  type, 
  severity, 
  user_name, 
  user_id, 
  metadata
) VALUES (
  '🧪 Test Notification',
  'This is a test notification to verify the system is working. If you can see this in the app, notifications are configured correctly!',
  'system',
  'info',
  'Test System',
  'test@yashreadlines.com',
  jsonb_build_object(
    'test', true,
    'immediate', true,
    'timestamp', NOW()::text
  )
);

-- =====================================================
-- 13. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM admin_notifications WHERE is_read = false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE admin_notifications SET is_read = true WHERE is_read = false;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old notification logs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM notification_logs WHERE created_at < NOW() - INTERVAL '30 days';
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 14. VERIFICATION QUERIES
-- =====================================================

-- Check if all tables exist
SELECT 
  'Tables Created' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'admin_notifications') as admin_notifications,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'device_tokens') as device_tokens,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notification_logs') as notification_logs;

-- Check notifications
SELECT 
  'Notifications' as status,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_read = false) as unread_notifications,
  COUNT(*) FILTER (WHERE type = 'system') as system_notifications
FROM admin_notifications;

-- Check indexes
SELECT 
  'Indexes' as status,
  COUNT(*) as total_indexes
FROM pg_indexes 
WHERE tablename IN ('admin_notifications', 'device_tokens', 'notification_logs');

-- =====================================================
-- 15. SETUP COMPLETE MESSAGE
-- =====================================================
SELECT 
  '🎉 Enhanced Notification System Setup Complete!' as message,
  'All tables, policies, indexes, and triggers have been created successfully.' as details,
  'You can now test notifications using the ComprehensiveNotificationTest screen.' as next_step;

-- =====================================================
-- INSTRUCTIONS FOR MANUAL TESTING:
--
-- 1. Run this script in Supabase SQL Editor
-- 2. Build and run your React Native app
-- 3. Navigate to ComprehensiveNotificationTest screen
-- 4. Run "Fix All Issues" button
-- 5. Run "Test All Tests" button
-- 6. Try "Test Immediate" for instant notification
-- 7. Check device notification panel
-- 8. Verify in Supabase dashboard under admin_notifications table
-- =====================================================