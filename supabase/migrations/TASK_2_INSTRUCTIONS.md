# Task 2: Apply Database Migration and Create Default Office

## Overview
This task applies migration 009 to add multi-office support to the database and creates the default office "Prem Darvaja Office".

## Prerequisites
- Access to Supabase Dashboard (https://app.supabase.com/project/rejkocbdaeyvsxdiamhu)
- OR Supabase CLI installed and configured
- OR Direct database access via psql

## Option 1: Using Supabase Dashboard (RECOMMENDED)

This is the easiest method and works directly in your browser.

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com/project/rejkocbdaeyvsxdiamhu
   - Log in with your credentials

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query" button

3. **Copy and Paste the Migration Script**
   - Open the file: `supabase/migrations/apply_migration_009_dashboard.sql`
   - Copy the ENTIRE contents of the file
   - Paste into the SQL editor

4. **Execute the Migration**
   - Click the "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for the script to complete (should take 5-10 seconds)

5. **Verify Success**
   - The results panel should show multiple "✓ PASS" messages
   - You should see the default office "Prem Darvaja Office" listed
   - All verification checks should pass

6. **Check the Results**
   - Navigate to "Table Editor" in the left sidebar
   - You should see a new table called "offices"
   - Click on "offices" to see the default office entry

### Expected Output:

```
✓ PASS - offices table
✓ PASS (9/9 columns found) - office_id columns
✓ PASS - Default office exists
✓ PASS (4/4 policies found) - RLS policies
```

You should also see a table listing the default office:
```
id                                   | name                  | address                    | is_active | created_at
------------------------------------ | --------------------- | -------------------------- | --------- | ----------
[UUID]                               | Prem Darvaja Office   | Prem Darvaja, Ahmedabad    | true      | [timestamp]
```

## Option 2: Using Supabase CLI

If you have Supabase CLI installed:

### Steps:

1. **Ensure you're logged in**
   ```bash
   supabase login
   ```

2. **Link to your project** (if not already linked)
   ```bash
   supabase link --project-ref rejkocbdaeyvsxdiamhu
   ```

3. **Apply the migration**
   ```bash
   supabase db push
   ```

4. **Insert the default office**
   ```bash
   supabase db execute --file supabase/migrations/insert_default_office.sql
   ```

5. **Verify the migration**
   ```bash
   supabase db execute --file supabase/migrations/verify_009_migration.sql
   ```

## Option 3: Using psql (Direct Database Connection)

If you have direct database access:

### Steps:

1. **Connect to the database**
   ```bash
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.rejkocbdaeyvsxdiamhu.supabase.co:5432/postgres"
   ```

2. **Run the migration script**
   ```bash
   \i supabase/migrations/009_add_multi_office_support.sql
   ```

3. **Insert the default office**
   ```sql
   INSERT INTO public.offices (name, address, is_active)
   VALUES ('Prem Darvaja Office', 'Prem Darvaja, Ahmedabad', true)
   ON CONFLICT (name) DO NOTHING;
   ```

4. **Verify the migration**
   ```bash
   \i supabase/migrations/verify_009_migration.sql
   ```

## Verification Checklist

After applying the migration, verify the following:

- [ ] `offices` table exists in the database
- [ ] `offices` table has the following columns:
  - [ ] `id` (UUID, primary key)
  - [ ] `name` (VARCHAR, unique)
  - [ ] `address` (TEXT)
  - [ ] `is_active` (BOOLEAN)
  - [ ] `created_by` (UUID)
  - [ ] `created_at` (TIMESTAMP)
  - [ ] `updated_at` (TIMESTAMP)
- [ ] Default office "Prem Darvaja Office" exists in the `offices` table
- [ ] `office_id` column added to the following tables:
  - [ ] `user_profiles`
  - [ ] `agency_payments`
  - [ ] `agency_majuri`
  - [ ] `driver_transactions`
  - [ ] `truck_fuel_entries`
  - [ ] `general_entries`
  - [ ] `agency_entries`
  - [ ] `uppad_jama_entries`
  - [ ] `cash_records`
- [ ] Indexes created on all `office_id` columns
- [ ] Row Level Security (RLS) enabled on `offices` table
- [ ] 4 RLS policies created on `offices` table:
  - [ ] "Users can read active offices"
  - [ ] "Admins can insert offices"
  - [ ] "Admins can update offices"
  - [ ] "Admins can delete offices"
- [ ] Trigger `update_offices_updated_at` created on `offices` table

## Troubleshooting

### Issue: "relation 'offices' already exists"
**Solution:** The migration is idempotent. This is not an error - it means the table already exists. Continue with the script.

### Issue: "column 'office_id' already exists"
**Solution:** The migration is idempotent. This is not an error - it means the column already exists. Continue with the script.

### Issue: "duplicate key value violates unique constraint"
**Solution:** The default office already exists. This is expected if you've run the script before.

### Issue: Permission denied
**Solution:** Make sure you're logged in as a user with admin privileges or using the service role key.

### Issue: Cannot connect to database
**Solution:** 
1. Check your internet connection
2. Verify the project URL is correct
3. Check if your Supabase project is active
4. Verify your credentials

## What This Migration Does

1. **Creates `offices` table** - Stores all office locations
2. **Adds `office_id` to 9 tables** - Links all data to offices
3. **Creates indexes** - Optimizes query performance
4. **Sets up RLS policies** - Secures office data access
5. **Adds triggers** - Auto-updates timestamps
6. **Inserts default office** - Creates "Prem Darvaja Office"

## Next Steps

After successfully completing this task:

1. ✅ Mark Task 2 as complete
2. ➡️ Proceed to Task 3: Database Security and RLS Policies for Transaction Tables
3. ➡️ Then Task 4: Data Migration Script (to update existing data)

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Remove office_id columns from all tables
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS office_id;
ALTER TABLE public.agency_payments DROP COLUMN IF EXISTS office_id;
ALTER TABLE public.agency_majuri DROP COLUMN IF EXISTS office_id;
ALTER TABLE public.driver_transactions DROP COLUMN IF EXISTS office_id;
ALTER TABLE public.truck_fuel_entries DROP COLUMN IF EXISTS office_id;
ALTER TABLE public.general_entries DROP COLUMN IF EXISTS office_id;
ALTER TABLE public.agency_entries DROP COLUMN IF EXISTS office_id;
ALTER TABLE public.uppad_jama_entries DROP COLUMN IF EXISTS office_id;
ALTER TABLE public.cash_records DROP COLUMN IF EXISTS office_id;

-- Drop offices table
DROP TABLE IF EXISTS public.offices CASCADE;
```

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the verification queries to identify what failed
3. Check Supabase logs for detailed error messages
4. Ensure you have the correct permissions

## Notes

- This migration is **idempotent** - safe to run multiple times
- No existing data will be lost
- The migration does NOT populate existing records with office_id (that's Task 4)
- All changes are backward compatible
