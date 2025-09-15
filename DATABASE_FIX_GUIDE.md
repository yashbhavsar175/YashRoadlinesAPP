# 🚨 Database Setup Error Fix

## Problem
```
ERROR: 42703: column user_profiles.user_id does not exist
```

## Solution Steps

### Step 1: Check Your Database Structure
Run `debug_database_structure.sql` in Supabase SQL Editor to check your current table structure.

### Step 2: Choose the Right Setup File

**Option A: If user_profiles table doesn't exist**
- Use `database_setup.sql` (updated version)
- This will create the user_profiles table with correct structure

**Option B: If user_profiles table exists but has different columns**
- Use `database_setup_alternative.sql` (temporary solution)
- This uses simple policies for now
- Then modify policies based on your actual column names

### Step 3: Quick Fix (Immediate Solution)

If you want to test the notification system immediately, use this simple SQL:

```sql
-- Create only the notifications table with simple policies
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  user_name TEXT,
  user_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS but allow all authenticated users (for testing)
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage notifications" ON admin_notifications
USING (auth.role() = 'authenticated');

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;
```

### Step 4: After Testing, Implement Proper Security

Once you know your user_profiles table structure, update the policies to restrict access to admins only.

## Files Created:
- ✅ `database_setup.sql` - Complete setup with user_profiles creation
- ✅ `database_setup_alternative.sql` - Alternative approach
- ✅ `debug_database_structure.sql` - Check current structure

## Next Steps:
1. Run debug script to check your database
2. Choose appropriate setup file
3. Test notification system
4. Implement proper admin-only policies
