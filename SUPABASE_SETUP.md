# Supabase Database Setup Guide

## Required Tables for Real-time Features

This app requires two additional tables for real-time notification features to work properly.

## Quick Setup (Recommended)

### Option 1: Using Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run Migration 1: user_notifications**
   - Copy the entire content from `supabase/migrations/20240228000000_create_user_notifications.sql`
   - Paste into the SQL editor
   - Click "Run" or press Ctrl+Enter
   - Wait for success message

4. **Run Migration 2: auth_events**
   - Create another new query
   - Copy the entire content from `supabase/migrations/20240228000001_create_auth_events.sql`
   - Paste into the SQL editor
   - Click "Run" or press Ctrl+Enter
   - Wait for success message

5. **Verify Setup**
   - Go to "Table Editor"
   - Check that these tables exist:
     - ✅ `user_notifications`
     - ✅ `auth_events`
   - Go to "Database" → "Replication"
   - Verify both tables are listed under "supabase_realtime" publication

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

## What These Tables Do

### user_notifications
- Stores real-time notifications for individual users
- Used by NotificationListener service
- Enables instant in-app notifications
- Users can only see their own notifications (RLS enabled)

### auth_events
- Tracks authentication events (logout, password changes, etc.)
- Used by AuthLogoutService
- Enables real-time force logout functionality
- Admin-only write access (RLS enabled)

## Troubleshooting

### Issue: "Notification channel closed" errors in console

**Cause:** Tables don't exist or Realtime is not enabled

**Solution:**
1. Verify tables exist in Supabase Dashboard
2. Check Database → Replication → Ensure tables are in publication
3. Restart the app after applying migrations

### Issue: RLS policy errors

**Cause:** Row Level Security policies not properly configured

**Solution:**
1. Go to Authentication → Policies
2. Verify policies exist for both tables
3. Re-run the migration SQL if policies are missing

### Issue: Still getting reconnection loops

**Cause:** Old app cache or connection issues

**Solution:**
1. Clear app data/cache
2. Restart the app completely
3. Check Supabase project status (not paused)
4. Verify internet connection

## Testing

After setup, test the notifications:

1. **Test NotificationListener:**
   - Insert a test notification in SQL Editor:
   ```sql
   INSERT INTO user_notifications (recipient_id, title, description, type)
   VALUES (
     (SELECT id FROM auth.users LIMIT 1),
     'Test Notification',
     'This is a test notification',
     'info'
   );
   ```
   - Check if notification appears in the app

2. **Test AuthLogoutService:**
   - Insert a test auth event:
   ```sql
   INSERT INTO auth_events (user_id, event_type, details)
   VALUES (
     (SELECT id FROM auth.users LIMIT 1),
     'forced_logout',
     '{"reason": "test"}'::jsonb
   );
   ```
   - User should be logged out immediately

## Support

If you encounter issues:
1. Check Supabase project logs
2. Check app console logs
3. Verify RLS policies are correct
4. Ensure Realtime is enabled on tables
