# Fix Office ID Issue - Summary

## Problem
User reported that entries created today are not showing when filtering by office. This is because:
1. Old entries have `office_id = NULL` in the database
2. Some screens were not passing `office_id` when saving new entries

## Solution Implemented

### 1. Database Migration (016_migrate_data_to_prem_darwaja.sql)
Created migration to update all NULL office_ids to "Prem Darawaja(Main Office)" for:
- general_entries
- agency_entries
- uppad_jama_entries
- driver_transactions
- agency_payments
- agency_majuri
- truck_fuel_entries
- cash_records
- user_profiles

### 2. Fixed Screens to Pass office_id

Updated the following screens to include `office_id` when saving new entries:

#### PaidSectionScreen.tsx
- Added `useOffice` import
- Added `getCurrentOfficeId()` hook
- Updated `saveAgencyPayment` call to include `office_id`

#### AddMajuriScreen.tsx
- Already had `useOffice` imported
- Updated `saveAgencyMajuri` call to include `office_id`

#### BackdatedEntryScreen.tsx
- Already had `useOffice` imported
- Updated `saveAgencyMajuri` call to include `office_id`
- Updated `saveAgencyPayment` call to include `office_id`

#### Already Fixed
- AddGeneralEntryScreen.tsx - Already passes office_id ✓
- AgencyPaymentsScreen.tsx - Already passes office_id ✓
- DailyReportScreen.tsx - Updates preserve existing office_id ✓

## Next Steps for User

### Step 1: Run the Migration
Execute this command in your terminal:
```bash
supabase db execute -f supabase/migrations/016_migrate_data_to_prem_darwaja.sql
```

### Step 2: Clear App Cache
After the migration completes, clear the app cache:
1. Open the app
2. Go to Admin Panel or Settings
3. Look for "Clear Cache" or "Sync Data" button
4. Tap it to refresh all data

OR simply uninstall and reinstall the app.

### Step 3: Test
1. Select "Prem Darawaja(Main Office)" from the office dropdown
2. Verify that all old entries now appear
3. Create a new entry (general, payment, or majuri)
4. Verify the new entry appears immediately when that office is selected

## Technical Details

### Storage Functions Already Support office_id
All save functions in Storage.ts already accept and handle office_id:
- `saveGeneralEntry` ✓
- `saveAgencyPayment` ✓
- `saveAgencyMajuri` ✓
- `saveAgencyEntry` ✓
- `saveUppadJamaEntry` ✓
- `saveDriverTransaction` ✓
- `saveTruckFuel` ✓

The issue was that some screens weren't passing this parameter when calling these functions.

### Office Context
The `useOffice` hook provides:
- `getCurrentOfficeId()` - Returns the currently selected office ID
- `currentOffice` - The full office object with name and other details

All entry screens now use `getCurrentOfficeId()` to get the current office and pass it to save functions.
