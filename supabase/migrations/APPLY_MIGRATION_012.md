# Apply Migration 012: Add office_id to daily_cash_adjustments

## Overview
This migration adds office support to the `daily_cash_adjustments` table, which is used by ManageCashScreen to store daily cash adjustments.

## Prerequisites
- Migration 009 (multi-office support) must be applied first
- Migration 011 (data migration to default office) must be applied first
- Default office "Prem Darvaja Office" must exist in the offices table

## What This Migration Does

1. **Adds office_id column** to `daily_cash_adjustments` table
2. **Creates index** on office_id for performance
3. **Updates unique constraint** from `date_key` only to `(date_key, office_id)` combination
4. **Migrates existing data** to assign all existing cash adjustments to the default office
5. **Adds documentation** comments to the column

## How to Apply

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `012_add_office_id_to_daily_cash_adjustments.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration
7. Check the output for the success message: `✅ Migration 012 completed successfully!`

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the project root directory
cd /path/to/your/project

# Apply the migration
supabase db push

# Or apply specific migration file
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/012_add_office_id_to_daily_cash_adjustments.sql
```

## Verification Steps

After applying the migration, verify it was successful:

### 1. Check Column Exists
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'daily_cash_adjustments'
  AND column_name = 'office_id';
```

Expected result: One row showing `office_id` column of type `uuid`

### 2. Check Index Exists
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'daily_cash_adjustments'
  AND indexname = 'idx_daily_cash_adjustments_office_id';
```

Expected result: One row showing the index definition

### 3. Check Unique Constraint
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'daily_cash_adjustments'
  AND constraint_name = 'daily_cash_adjustments_date_key_office_id_key';
```

Expected result: One row showing the unique constraint

### 4. Verify Data Migration
```sql
SELECT 
  COUNT(*) as total_records,
  COUNT(office_id) as records_with_office,
  COUNT(*) - COUNT(office_id) as records_without_office
FROM public.daily_cash_adjustments;
```

Expected result: `records_without_office` should be 0 (all records have office_id)

### 5. Test Insert with Office ID
```sql
-- Get default office ID
SELECT id FROM public.offices WHERE name = 'Prem Darvaja Office' LIMIT 1;

-- Test insert (replace <office_id> with actual ID from above)
INSERT INTO public.daily_cash_adjustments (date_key, office_id, adjustment)
VALUES ('2026-02-08', '<office_id>', 100.00)
ON CONFLICT (date_key, office_id) DO UPDATE SET adjustment = EXCLUDED.adjustment;

-- Verify insert
SELECT * FROM public.daily_cash_adjustments WHERE date_key = '2026-02-08';

-- Clean up test data
DELETE FROM public.daily_cash_adjustments WHERE date_key = '2026-02-08';
```

## Impact on Application

### ManageCashScreen
- Now saves cash adjustments with office_id
- Cash adjustments are office-specific
- Users can only see/modify adjustments for their current office

### DailyReportScreen
- Loads cash adjustments filtered by current office
- Each office has independent cash adjustments per date

## Rollback Plan

If you need to rollback this migration:

```sql
-- Remove the unique constraint
ALTER TABLE public.daily_cash_adjustments 
DROP CONSTRAINT IF EXISTS daily_cash_adjustments_date_key_office_id_key;

-- Add back the old unique constraint
ALTER TABLE public.daily_cash_adjustments 
ADD CONSTRAINT daily_cash_adjustments_date_key_key UNIQUE (date_key);

-- Drop the index
DROP INDEX IF EXISTS idx_daily_cash_adjustments_office_id;

-- Remove the office_id column
ALTER TABLE public.daily_cash_adjustments 
DROP COLUMN IF EXISTS office_id;
```

**Warning**: Rollback will lose office-specific cash adjustment data. Only rollback if absolutely necessary.

## Troubleshooting

### Error: "relation 'offices' does not exist"
- **Cause**: Migration 009 hasn't been applied
- **Solution**: Apply migration 009 first

### Error: "duplicate key value violates unique constraint"
- **Cause**: Trying to insert duplicate (date_key, office_id) combination
- **Solution**: This is expected behavior. Use UPSERT instead of INSERT

### Error: "column 'office_id' already exists"
- **Cause**: Migration has already been applied
- **Solution**: No action needed, migration is idempotent

## Next Steps

After applying this migration:

1. ✅ Test ManageCashScreen functionality
2. ✅ Verify cash adjustments are office-specific
3. ✅ Test switching offices and verify separate adjustments
4. ✅ Verify DailyReportScreen shows correct adjustments per office

## Related Files

- Migration SQL: `012_add_office_id_to_daily_cash_adjustments.sql`
- Screen Implementation: `src/screens/ManageCashScreen.tsx`
- Daily Report: `src/screens/DailyReportScreen.tsx`
- Task Documentation: `.kiro/specs/multi-office-support/tasks.md` (Task 20)
