-- Quick Database Fix Script
-- Run this to fix existing notification system issues

-- Step 1: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON admin_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON admin_notifications;

-- Step 2: Recreate policies
CREATE POLICY "Authenticated users can view notifications" ON admin_notifications
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update notifications" ON admin_notifications
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete notifications" ON admin_notifications
FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert notifications" ON admin_notifications
FOR INSERT WITH CHECK (true);

-- Step 3: Clear existing test data and add fresh samples
DELETE FROM admin_notifications WHERE user_name IN ('Test User', 'System');

INSERT INTO admin_notifications (title, message, type, severity, user_name, metadata) VALUES 
('✅ System Ready', 'Notification system is now working properly', 'system', 'success', 'System', '{"source": "fix"}'),
('🧪 Test Complete', 'All database issues have been resolved', 'system', 'info', 'Admin', '{"test": "fixed"}');

-- Verification query
SELECT 
    id,
    title,
    type,
    severity,
    is_read,
    user_name,
    created_at
FROM admin_notifications 
ORDER BY created_at DESC 
LIMIT 5;
