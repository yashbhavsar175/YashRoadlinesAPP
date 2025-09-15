-- Update Database Schema for Soft Delete
-- Run this SQL in your Supabase SQL Editor

-- Add deleted column to admin_notifications table
ALTER TABLE admin_notifications 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Create index for deleted column
CREATE INDEX IF NOT EXISTS idx_admin_notifications_deleted ON admin_notifications(deleted);

-- Update existing notifications to have deleted = false
UPDATE admin_notifications SET deleted = FALSE WHERE deleted IS NULL;

-- Test query to see the new structure
SELECT 
    id,
    title,
    type,
    severity,
    is_read,
    deleted,
    user_name,
    created_at
FROM admin_notifications 
ORDER BY created_at DESC 
LIMIT 5;
