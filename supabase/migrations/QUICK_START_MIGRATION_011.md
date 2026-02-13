# Quick Start: Execute Migration 011

## 🚀 Fastest Way to Execute

### Using Supabase Dashboard (Recommended)

1. **Go to**: https://supabase.com/dashboard → Your Project → SQL Editor

2. **Copy & Run Migration**:
   - Open file: `supabase/migrations/011_migrate_existing_data_to_default_office.sql`
   - Copy all contents
   - Paste in SQL Editor
   - Click "Run"
   - ✅ Look for "✓ Data migration completed successfully!"

3. **Copy & Run Verification**:
   - Open file: `supabase/migrations/verify_data_migration_011.sql`
   - Copy all contents
   - Paste in SQL Editor
   - Click "Run"
   - ✅ Verify all checks show "✓ PASS"

## ✅ Success Criteria

Migration is successful when:
- ✅ Migration output shows "✓ Data migration completed successfully!"
- ✅ All verification checks show "✓ PASS"
- ✅ No NULL office_id values in any table
- ✅ No orphaned records (0 for all tables)

## 📋 What Gets Updated

- **User Profiles**: All users assigned to "Prem Darvaja Office"
- **Transactions**: All 8 transaction tables updated
  - agency_payments
  - agency_majuri
  - driver_transactions
  - truck_fuel_entries
  - general_entries
  - agency_entries
  - uppad_jama_entries
  - cash_records

## ⚠️ Prerequisites

Before running:
- ✅ Migration 009 applied (schema changes)
- ✅ Task 2 completed (default office created)
- ✅ Task 3 completed (RLS policies)

## 🔄 Safe to Re-run

This migration is **idempotent** - safe to run multiple times. It only updates records with NULL office_id.

## 📖 Need More Details?

See `EXECUTE_MIGRATION_011.md` for:
- Detailed instructions
- Troubleshooting guide
- Rollback instructions
- CLI commands

## 🎯 Next Steps After Migration

1. ✅ Verify all checks pass
2. ✅ Mark Task 4 as complete
3. ➡️ Proceed to Task 5: Office Data Models and Types
