# Execute Migration 011: Data Migration to Default Office

## Overview
This guide walks through executing migration 011, which migrates all existing data to the default office "Prem Darvaja Office".

## Prerequisites
✅ Migration 009 has been applied (schema changes)
✅ Task 2 completed (default office created)
✅ Task 3 completed (RLS policies applied)

## Migration Files
- **Migration Script**: `011_migrate_existing_data_to_default_office.sql`
- **Verification Script**: `verify_data_migration_011.sql`

## What This Migration Does
1. Updates all user profiles with NULL office_id to default office
2. Updates all transaction records with NULL office_id to default office
3. Provides detailed summary of records updated
4. Ensures data integrity

## Execution Steps

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Execute Migration Script**
   - Open `supabase/migrations/011_migrate_existing_data_to_default_office.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" button

4. **Review Migration Output**
   - Check the "Results" panel for migration summary
   - Verify the number of records updated
   - Look for "✓ Data migration completed successfully!" message

5. **Run Verification Script**
   - Click "New Query" again
   - Open `supabase/migrations/verify_data_migration_011.sql`
   - Copy and paste the contents
   - Click "Run" button
   - Verify all checks show "✓ PASS"

### Option 2: Using Supabase CLI

1. **Ensure Supabase CLI is installed and linked**
   ```bash
   supabase --version
   supabase link --project-ref your-project-ref
   ```

2. **Apply Migration**
   ```bash
   supabase db push
   ```
   
   Or apply specific migration:
   ```bash
   psql -h your-db-host -U postgres -d postgres -f supabase/migrations/011_migrate_existing_data_to_default_office.sql
   ```

3. **Run Verification**
   ```bash
   psql -h your-db-host -U postgres -d postgres -f supabase/migrations/verify_data_migration_011.sql
   ```

## Expected Results

### Migration Output
```
========================================
Starting Data Migration to Default Office
========================================

Default Office ID: [UUID]

Updating user_profiles...
  ✓ Updated X user profiles

Updating transaction tables...
  ✓ Updated X agency_payments
  ✓ Updated X agency_majuri
  ✓ Updated X driver_transactions
  ✓ Updated X truck_fuel_entries
  ✓ Updated X general_entries
  ✓ Updated X agency_entries
  ✓ Updated X uppad_jama_entries
  ✓ Updated X cash_records

========================================
Migration Summary
========================================
Total records updated: X

Breakdown:
  - User Profiles: X
  - Agency Payments: X
  - Agency Majuri: X
  - Driver Transactions: X
  - Truck Fuel Entries: X
  - General Entries: X
  - Agency Entries: X
  - Uppad Jama Entries: X
  - Cash Records: X

✓ Data migration completed successfully!
```

### Verification Output
All tables should show:
- ✓ PASS status
- 0 records without office_id
- 0 orphaned records
- All records assigned to "Prem Darvaja Office"

## Troubleshooting

### Error: "Default office 'Prem Darvaja Office' not found"
**Solution**: Run Task 2 first to create the default office
```sql
-- Check if default office exists
SELECT * FROM public.offices WHERE name = 'Prem Darvaja Office';
```

### Error: "column office_id does not exist"
**Solution**: Run migration 009 first to add office_id columns
```sql
-- Check if office_id column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'office_id';
```

### Some Records Still Have NULL office_id
**Solution**: Re-run the migration script - it's idempotent and safe to run multiple times

### Orphaned Records Found
**Solution**: This indicates data integrity issues. Check which office_id values are invalid:
```sql
-- Find invalid office_id values
SELECT DISTINCT office_id 
FROM public.user_profiles 
WHERE office_id NOT IN (SELECT id FROM public.offices);
```

## Post-Migration Verification Checklist

- [ ] Migration script executed successfully
- [ ] Verification script shows all ✓ PASS
- [ ] No NULL office_id values in any table
- [ ] No orphaned records
- [ ] All records assigned to "Prem Darvaja Office"
- [ ] User profiles have office_id assigned
- [ ] Transaction tables have office_id assigned

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Set all office_id values back to NULL
UPDATE public.user_profiles SET office_id = NULL;
UPDATE public.agency_payments SET office_id = NULL;
UPDATE public.agency_majuri SET office_id = NULL;
UPDATE public.driver_transactions SET office_id = NULL;
UPDATE public.truck_fuel_entries SET office_id = NULL;
UPDATE public.general_entries SET office_id = NULL;
UPDATE public.agency_entries SET office_id = NULL;
UPDATE public.uppad_jama_entries SET office_id = NULL;
UPDATE public.cash_records SET office_id = NULL;
```

**Note**: Rollback should only be done if there are critical issues. The migration is designed to be safe and idempotent.

## Next Steps

After successful migration:
1. ✅ Mark Task 4 as complete
2. ➡️ Proceed to Task 5: Office Data Models and Types
3. Begin implementing OfficeContext and UI components

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the migration output for specific error messages
3. Verify prerequisites are met
4. Check Supabase logs for detailed error information
