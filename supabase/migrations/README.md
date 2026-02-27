# Supabase Migrations

This directory contains SQL migration files for the database schema.

## Recent Migrations

### 20240228000000_create_user_notifications.sql
Creates the `user_notifications` table for real-time user notifications.

**Features:**
- Stores notifications for individual users
- RLS policies for user privacy
- Realtime enabled for instant notifications
- Automatic timestamp updates

**To apply:**
```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard SQL Editor
# Copy and paste the SQL file content
```

### 20240228000001_create_auth_events.sql
Creates the `auth_events` table for authentication event tracking.

**Features:**
- Tracks forced logout, password changes, account status
- Admin-only insert permissions
- Realtime enabled for instant logout notifications
- Automatic event handling triggers

**To apply:**
```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard SQL Editor
# Copy and paste the SQL file content
```

## Manual Application Steps

If you don't have Supabase CLI installed:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy the contents of each migration file
5. Run the query
6. Verify tables are created in Table Editor

## Verification

After applying migrations, verify:

1. **Tables exist:**
   - `user_notifications`
   - `auth_events`

2. **Realtime is enabled:**
   - Go to Database → Replication
   - Check both tables are in the publication

3. **RLS is enabled:**
   - Go to Authentication → Policies
   - Verify policies exist for both tables

## Rollback

To rollback these migrations:

```sql
-- Drop user_notifications table
DROP TABLE IF EXISTS public.user_notifications CASCADE;

-- Drop auth_events table
DROP TABLE IF EXISTS public.auth_events CASCADE;
```

## Notes

- These tables are required for NotificationListener and AuthLogoutService to work
- Without these tables, the services will fail to connect and cause reconnection loops
- RLS policies ensure users can only see their own data
- Admins have additional permissions for auth_events
