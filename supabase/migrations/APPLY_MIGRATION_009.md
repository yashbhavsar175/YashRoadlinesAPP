# How to Apply Migration 009: Multi-Office Support

This document explains how to apply the multi-office support migration to your Supabase database.

## Migration File
`009_add_multi_office_support.sql`

## What This Migration Does

1. **Creates `offices` table** with columns:
   - `id` (UUID, primary key)
   - `name` (VARCHAR, unique, required)
   - `address` (TEXT, optional)
   - `is_active` (BOOLEAN, default true)
   - `created_by` (UUID, references auth.users)
   - `created_at` and `updated_at` (timestamps)

2. **Adds `office_id` column** to the following tables:
   - `user_profiles`
   - `agency_payments`
   - `agency_majuri`
   - `driver_transactions`
   - `truck_fuel_entries`
   - `general_entries`
   - `agency_entries`
   - `uppad_jama_entries`
   - `cash_records`

3. **Creates indexes** on all `office_id` columns for performance optimization

4. **Sets up Row Level Security (RLS)** policies for the `offices` table:
   - Users can read all active offices
   - Only admins can create, update, or delete offices

5. **Adds triggers** to automatically update the `updated_at` timestamp

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com/project/rejkocbdaeyvsxdiamhu
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `009_add_multi_office_support.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration
7. Verify success by checking the **Table Editor** for the new `offices` table

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref rejkocbdaeyvsxdiamhu

# Apply the migration
supabase db push
```

### Option 3: Using psql (Direct Database Connection)

If you have direct database access:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.rejkocbdaeyvsxdiamhu.supabase.co:5432/postgres" -f supabase/migrations/009_add_multi_office_support.sql
```

## Verification Steps

After applying the migration, verify it was successful:

1. **Check if `offices` table exists:**
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'offices';
   ```

2. **Check if `office_id` columns were added:**
   ```sql
   SELECT table_name, column_name 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND column_name = 'office_id'
   ORDER BY table_name;
   ```

3. **Check indexes:**
   ```sql
   SELECT tablename, indexname 
   FROM pg_indexes 
   WHERE schemaname = 'public' 
   AND indexname LIKE '%office_id%'
   ORDER BY tablename;
   ```

4. **Check RLS policies:**
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE tablename = 'offices';
   ```

## Expected Results

After successful migration, you should see:
- 1 new table: `offices`
- 9 new columns: `office_id` in each transaction table and `user_profiles`
- 10 new indexes: one for each `office_id` column
- 4 RLS policies on the `offices` table
- 1 trigger on the `offices` table

## Rollback (If Needed)

If you need to rollback this migration, run:

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

## Next Steps

After applying this migration:
1. Run the data migration script (Task 3) to populate the default office
2. Update existing data with the default office_id
3. Deploy the application code changes

## Notes

- This migration is **idempotent** - it can be run multiple times safely
- All `ALTER TABLE` statements check if columns exist before adding them
- All `CREATE INDEX` statements use `IF NOT EXISTS` to prevent errors
- The migration does NOT populate data - that's handled in Task 3
