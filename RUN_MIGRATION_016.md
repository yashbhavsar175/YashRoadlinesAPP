# Execute Migration 016 - Migrate Data to Prem Darwaja

## Step 1: Run the Migration

Execute this command in your terminal:

```bash
supabase db execute -f supabase/migrations/016_migrate_data_to_prem_darwaja.sql
```

## Step 2: Verify the Migration

After running the migration, verify the data was updated:

```sql
-- Check general_entries
SELECT COUNT(*) as total, 
       COUNT(office_id) as with_office,
       COUNT(*) - COUNT(office_id) as without_office
FROM general_entries;

-- Check agency_payments
SELECT COUNT(*) as total, 
       COUNT(office_id) as with_office,
       COUNT(*) - COUNT(office_id) as without_office
FROM agency_payments;

-- Check agency_majuri
SELECT COUNT(*) as total, 
       COUNT(office_id) as with_office,
       COUNT(*) - COUNT(office_id) as without_office
FROM agency_majuri;
```

All entries should now have office_id assigned to "Prem Darawaja(Main Office)".

## Step 3: Clear App Cache

After the migration completes, you need to clear the app cache so it fetches fresh data from the database:

1. Open the app
2. Go to Settings or Admin Panel
3. Look for "Clear Cache" or "Sync Data" button
4. Tap it to refresh all data

Alternatively, you can uninstall and reinstall the app to clear all cached data.
