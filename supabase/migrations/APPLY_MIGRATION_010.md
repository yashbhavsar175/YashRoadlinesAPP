# Migration 010: RLS Policies for Multi-Office Support

## Overview
This migration adds Row Level Security (RLS) policies to all transaction tables to ensure proper data segregation by office.

## What This Migration Does

1. **Enables RLS** on all transaction tables:
   - agency_payments
   - agency_majuri
   - driver_transactions
   - truck_fuel_entries
   - general_entries
   - agency_entries
   - uppad_jama_entries
   - cash_records

2. **Creates 4 policies per table** (32 policies total):
   - SELECT: Users see only their office's data; admins see all
   - INSERT: Users can only insert for their office; admins can insert for any office
   - UPDATE: Users can only update their office's data; admins can update all
   - DELETE: Users can only delete their office's data; admins can delete all

## Prerequisites

✅ Migration 009 must be applied first (adds office_id columns)
✅ Default office "Prem Darvaja Office" must exist
✅ All users must have office_id assigned

## How to Apply

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `010_add_rls_policies_for_offices.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for completion message
8. Verify the results in the output panel

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the project root directory
cd /path/to/your/project

# Apply the migration
supabase db push

# Or apply specific migration
supabase migration up
```

## Verification Steps

### 1. Verify RLS is Enabled

Run this query in SQL Editor:

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN (
  'agency_payments',
  'agency_majuri',
  'driver_transactions',
  'truck_fuel_entries',
  'general_entries',
  'agency_entries',
  'uppad_jama_entries',
  'cash_records'
)
ORDER BY tablename;
```

**Expected Result:** All tables should show `rls_enabled = true`

### 2. Verify Policy Count

Run this query:

```sql
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'agency_payments',
  'agency_majuri',
  'driver_transactions',
  'truck_fuel_entries',
  'general_entries',
  'agency_entries',
  'uppad_jama_entries',
  'cash_records'
)
GROUP BY schemaname, tablename
ORDER BY tablename;
```

**Expected Result:** Each table should have 4 policies (SELECT, INSERT, UPDATE, DELETE)

### 3. List All Policies

To see all policy names:

```sql
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN (
  'agency_payments',
  'agency_majuri',
  'driver_transactions',
  'truck_fuel_entries',
  'general_entries',
  'agency_entries',
  'uppad_jama_entries',
  'cash_records'
)
ORDER BY tablename, cmd;
```

## Testing RLS Policies

### Test 1: Admin User Can See All Data

```sql
-- Set session to admin user (replace with actual admin user ID)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "admin-user-id-here"}';

-- This should return all transactions from all offices
SELECT COUNT(*) as total_transactions FROM agency_payments;
```

### Test 2: Regular User Sees Only Their Office Data

```sql
-- Set session to regular user (replace with actual user ID)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "regular-user-id-here"}';

-- This should return only transactions from user's assigned office
SELECT COUNT(*) as my_office_transactions FROM agency_payments;

-- Verify office_id matches user's assigned office
SELECT DISTINCT office_id FROM agency_payments;
```

### Test 3: User Cannot Insert for Different Office

```sql
-- As regular user, try to insert for a different office
-- This should fail or be filtered out
INSERT INTO agency_payments (office_id, agency_name, amount, date)
VALUES ('different-office-id', 'Test Agency', 1000, CURRENT_DATE);
```

### Test 4: Test Each Transaction Table

Repeat the above tests for each table:
- agency_majuri
- driver_transactions
- truck_fuel_entries
- general_entries
- agency_entries
- uppad_jama_entries
- cash_records

## Expected Behavior After Migration

### For Admin Users (is_admin = true):
- ✅ Can SELECT all transactions from all offices
- ✅ Can INSERT transactions for any office
- ✅ Can UPDATE transactions from any office
- ✅ Can DELETE transactions from any office

### For Regular Users (is_admin = false):
- ✅ Can SELECT only transactions from their assigned office
- ✅ Can INSERT only transactions for their assigned office
- ✅ Can UPDATE only transactions from their assigned office
- ✅ Can DELETE only transactions from their assigned office
- ❌ Cannot see transactions from other offices
- ❌ Cannot modify transactions from other offices

## Troubleshooting

### Issue: "permission denied for table X"

**Cause:** RLS is blocking access because user doesn't have office_id assigned

**Solution:**
```sql
-- Check user's office assignment
SELECT id, full_name, office_id, is_admin 
FROM user_profiles 
WHERE id = 'user-id-here';

-- Assign office if missing
UPDATE user_profiles 
SET office_id = 'default-office-id' 
WHERE id = 'user-id-here';
```

### Issue: "User can see data from other offices"

**Cause:** RLS policies may not be applied correctly

**Solution:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'agency_payments';

-- Check if policies exist
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'agency_payments';

-- Re-apply migration if needed
```

### Issue: "Admin cannot see all data"

**Cause:** User's is_admin flag may not be set correctly

**Solution:**
```sql
-- Check admin status
SELECT id, full_name, is_admin 
FROM user_profiles 
WHERE id = 'admin-user-id';

-- Set admin flag if needed
UPDATE user_profiles 
SET is_admin = true 
WHERE id = 'admin-user-id';
```

## Rollback Plan

If you need to rollback this migration:

```sql
-- Disable RLS on all tables
ALTER TABLE agency_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE agency_majuri DISABLE ROW LEVEL SECURITY;
ALTER TABLE driver_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE truck_fuel_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE general_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE agency_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE uppad_jama_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_records DISABLE ROW LEVEL SECURITY;

-- Drop all policies (repeat for each table)
DROP POLICY IF EXISTS "Users can view agency_payments from their office" ON agency_payments;
DROP POLICY IF EXISTS "Users can insert agency_payments for their office" ON agency_payments;
DROP POLICY IF EXISTS "Users can update agency_payments from their office" ON agency_payments;
DROP POLICY IF EXISTS "Users can delete agency_payments from their office" ON agency_payments;

-- (Repeat for all other tables...)
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **RLS is enforced at the database level** - Even if the app has bugs, users cannot access other offices' data
2. **Admin privileges are powerful** - Only grant is_admin = true to trusted users
3. **Office assignments are critical** - Always ensure users have office_id assigned
4. **Test thoroughly** - Verify RLS policies work correctly before deploying to production
5. **Monitor access logs** - Watch for unauthorized access attempts

## Next Steps

After applying this migration:

1. ✅ Verify all policies are created (32 total)
2. ✅ Test with admin user account
3. ✅ Test with regular user account
4. ✅ Test with majur user account
5. ✅ Verify data segregation works correctly
6. ✅ Proceed to Task 4: Data Migration Script

## Support

If you encounter issues:
1. Check the verification queries above
2. Review the troubleshooting section
3. Verify migration 009 was applied successfully
4. Check user_profiles table for office_id assignments
5. Review Supabase logs for error messages
