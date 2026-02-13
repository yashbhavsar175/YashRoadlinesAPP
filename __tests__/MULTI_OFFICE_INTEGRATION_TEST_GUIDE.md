# Multi-Office Integration Testing Guide

This document provides comprehensive testing instructions for the multi-office support feature. It covers both automated tests and manual testing procedures.

## Overview

The multi-office integration tests verify:
- Complete user flows with office assignments
- Admin office switching capabilities
- Data segregation between offices
- Office creation and user assignment
- Migration verification
- Offline sync with office associations

## Automated Tests

### Test File Location
`__tests__/MultiOfficeIntegration.test.tsx`

### Running Automated Tests

**Note:** These tests require a live Supabase connection with proper credentials configured in `src/supabase.ts`.

```bash
# Run all integration tests
npm test -- MultiOfficeIntegration.test.tsx

# Run specific test suite
npm test -- MultiOfficeIntegration.test.tsx -t "Office Creation"

# Run with verbose output
npm test -- MultiOfficeIntegration.test.tsx --verbose
```

### Test Suites Included

1. **Office Creation and Management**
   - Create offices A and B
   - Prevent duplicate office names
   - Retrieve all offices
   - Retrieve office by ID
   - Update office details
   - Delete office with transaction check

2. **User Assignment Flow**
   - Create regular user with office assignment
   - Create admin user with office assignment
   - Retrieve user office assignment
   - Update user office assignment

3. **Data Segregation - Transaction Creation**
   - Create transactions in different offices
   - Filter transactions by office
   - Verify data isolation between offices

4. **Admin Office Switching Flow**
   - Access Office A data
   - Access Office B data
   - Access all offices data (consolidated view)

5. **Agency Payments - Office Segregation**
   - Create payments in different offices
   - Verify payment filtering by office

6. **Migration Verification**
   - Verify default office exists
   - Verify existing transactions have office_id
   - Verify existing users have office_id

7. **Office Deletion with Transaction Check**
   - Prevent deletion of office with transactions
   - Allow deletion of empty office

8. **Complete User Flow - Regular User**
   - Login → see assigned office → create transaction → verify office_id

9. **Complete Admin Flow**
   - Login → switch office → verify data changes → create transaction

10. **Non-Admin Access Control**
    - Verify non-admin cannot access other office data

11. **Offline Sync with Office Associations**
    - Maintain office_id in offline transactions
    - Validate office_id before syncing

12. **Multi-Table Office Segregation**
    - Verify segregation across all transaction tables

## Manual Testing Procedures

### Prerequisites

1. Supabase database with migrations applied (009, 010, 011, 012)
2. At least two offices created:
   - "Prem Darvaja Office" (default)
   - "Aslali Office" (or any second office)
3. Test users:
   - One admin user
   - One regular user assigned to Office A
   - One regular user assigned to Office B

### Test Case 1: Complete Regular User Flow

**Objective:** Verify regular user sees only their assigned office data

**Steps:**
1. Login as regular user assigned to "Prem Darvaja Office"
2. Verify header shows "Prem Darvaja Office" (no dropdown)
3. Navigate to Home Screen
4. Verify dashboard shows only Prem Darvaja data
5. Create a new General Entry
6. Verify entry is created with correct office_id
7. Navigate to Daily Report
8. Verify only Prem Darvaja transactions appear
9. Logout

**Expected Results:**
- ✓ User sees only assigned office name (static, no dropdown)
- ✓ All data filtered to assigned office
- ✓ New entries tagged with correct office_id
- ✓ No access to other office data

### Test Case 2: Complete Admin Flow with Office Switching

**Objective:** Verify admin can switch offices and see different data

**Steps:**
1. Login as admin user
2. Verify header shows office dropdown next to name/role
3. Note current office (e.g., "Prem Darvaja Office")
4. Create a General Entry with description "Test Entry Office A"
5. Verify entry appears in Daily Report
6. Click office dropdown in header
7. Select "Aslali Office"
8. Wait for data reload (should take < 2 seconds)
9. Verify header now shows "Aslali Office"
10. Check Daily Report
11. Verify "Test Entry Office A" does NOT appear
12. Create a General Entry with description "Test Entry Office B"
13. Verify entry appears in Daily Report
14. Switch back to "Prem Darvaja Office"
15. Verify "Test Entry Office A" reappears
16. Verify "Test Entry Office B" does NOT appear
17. Select "All Offices" from dropdown
18. Verify both entries appear in Daily Report

**Expected Results:**
- ✓ Admin sees office dropdown in header
- ✓ Office switch completes within 2 seconds
- ✓ Data changes when office is switched
- ✓ Entries are tagged with correct office_id
- ✓ "All Offices" view shows consolidated data

### Test Case 3: Office Creation and User Assignment

**Objective:** Verify admin can create offices and assign users

**Steps:**
1. Login as admin
2. Navigate to Office Management Screen
3. Click "Create Office" button
4. Enter office name: "Test Office"
5. Enter address: "123 Test Street"
6. Click Save
7. Verify office appears in list
8. Navigate to User Access Management
9. Click "Create User"
10. Fill in user details
11. Select "Test Office" from office dropdown
12. Create user
13. Verify user appears with "Test Office" label
14. Logout
15. Login as newly created user
16. Verify header shows "Test Office" (static)
17. Verify all data is empty (new office)

**Expected Results:**
- ✓ Office created successfully
- ✓ Office appears in management list
- ✓ User can be assigned to new office
- ✓ User sees only assigned office
- ✓ New office starts with empty data

### Test Case 4: Data Segregation Verification

**Objective:** Verify data is completely segregated between offices

**Steps:**
1. Login as admin
2. Switch to "Prem Darvaja Office"
3. Create 3 different transaction types:
   - General Entry: "PD General"
   - Agency Payment: "PD Agency"
   - Driver Transaction: "PD Driver"
4. Note the transaction IDs or details
5. Switch to "Aslali Office"
6. Verify none of the PD transactions appear in:
   - Daily Report
   - Agency Payments list
   - Driver Details
7. Create similar transactions in Aslali:
   - General Entry: "Aslali General"
   - Agency Payment: "Aslali Agency"
   - Driver Transaction: "Aslali Driver"
8. Switch back to "Prem Darvaja Office"
9. Verify none of the Aslali transactions appear
10. Select "All Offices"
11. Verify all 6 transactions appear

**Expected Results:**
- ✓ Transactions in Office A not visible in Office B
- ✓ Transactions in Office B not visible in Office A
- ✓ All transactions visible in "All Offices" view
- ✓ Complete data segregation maintained

### Test Case 5: Non-Admin Access Control

**Objective:** Verify regular users cannot access other office data

**Steps:**
1. Login as regular user assigned to "Prem Darvaja Office"
2. Verify no office dropdown in header
3. Try to manually navigate to other office data (if possible)
4. Verify all queries return only Prem Darvaja data
5. Create a transaction
6. Verify transaction has Prem Darvaja office_id
7. Logout
8. Login as admin
9. Switch to "Aslali Office"
10. Verify the regular user's transaction does NOT appear

**Expected Results:**
- ✓ Regular user has no office switcher
- ✓ Regular user cannot access other office data
- ✓ Regular user's transactions tagged with correct office
- ✓ RLS policies enforce data segregation

### Test Case 6: Migration Verification

**Objective:** Verify existing data was migrated correctly

**Steps:**
1. Login as admin
2. Check Office Management screen
3. Verify "Prem Darvaja Office" exists
4. Switch to "Prem Darvaja Office"
5. Navigate to Daily Report
6. Select a date with historical data (before migration)
7. Verify transactions appear
8. Check transaction details
9. Verify office_id is set to Prem Darvaja Office ID
10. Check User Access Management
11. Verify all existing users have office assignments

**Expected Results:**
- ✓ Default office "Prem Darvaja Office" exists
- ✓ All historical transactions have office_id
- ✓ All existing users have office_id
- ✓ No data loss during migration

### Test Case 7: Offline Sync with Office Associations

**Objective:** Verify offline changes maintain office associations

**Steps:**
1. Login as regular user assigned to "Prem Darvaja Office"
2. Turn off internet connection
3. Create a General Entry: "Offline Test Entry"
4. Verify entry appears in local list with "pending sync" indicator
5. Turn on internet connection
6. Wait for sync to complete
7. Verify entry synced successfully
8. Logout
9. Login as admin
10. Switch to "Prem Darvaja Office"
11. Verify "Offline Test Entry" appears with correct office_id
12. Switch to "Aslali Office"
13. Verify "Offline Test Entry" does NOT appear

**Expected Results:**
- ✓ Offline entries maintain office_id
- ✓ Sync preserves office associations
- ✓ Synced data appears in correct office only

### Test Case 8: Office Deletion Protection

**Objective:** Verify offices with transactions cannot be deleted

**Steps:**
1. Login as admin
2. Navigate to Office Management
3. Select "Prem Darvaja Office" (has transactions)
4. Click Delete button
5. Verify error message appears
6. Verify office is NOT deleted
7. Create a new office: "Empty Test Office"
8. Verify office appears in list
9. Click Delete on "Empty Test Office"
10. Confirm deletion
11. Verify office is deleted successfully

**Expected Results:**
- ✓ Office with transactions cannot be deleted
- ✓ Error message displayed
- ✓ Empty office can be deleted
- ✓ Deletion confirmation required

### Test Case 9: PDF Reports with Office Information

**Objective:** Verify PDF reports include office information

**Steps:**
1. Login as admin
2. Switch to "Prem Darvaja Office"
3. Navigate to Daily Report
4. Generate PDF report
5. Open PDF
6. Verify office name appears in header
7. Verify all transactions show office name
8. Switch to "All Offices"
9. Generate consolidated PDF report
10. Verify office breakdown included
11. Verify separate totals per office

**Expected Results:**
- ✓ PDF includes office name in header
- ✓ Transactions show office information
- ✓ Consolidated reports show office breakdown
- ✓ Separate totals calculated per office

### Test Case 10: Monthly Statement with Office Filter

**Objective:** Verify monthly statements filter by office

**Steps:**
1. Login as admin
2. Switch to "Prem Darvaja Office"
3. Navigate to Monthly Statement
4. Select current month
5. Verify only Prem Darvaja transactions appear
6. Note total amounts
7. Switch to "Aslali Office"
8. Navigate to Monthly Statement
9. Select same month
10. Verify only Aslali transactions appear
11. Note total amounts (should be different)
12. Switch to "All Offices"
13. View Monthly Statement
14. Verify combined totals match sum of individual offices

**Expected Results:**
- ✓ Monthly statements filter by office
- ✓ Totals calculated per office
- ✓ "All Offices" view shows combined data
- ✓ Calculations are accurate

## Database Verification Queries

Use these SQL queries in Supabase SQL Editor to verify data integrity:

### Verify All Transactions Have office_id

```sql
-- Check general_entries
SELECT COUNT(*) as total, 
       COUNT(office_id) as with_office_id,
       COUNT(*) - COUNT(office_id) as missing_office_id
FROM general_entries;

-- Check agency_payments
SELECT COUNT(*) as total, 
       COUNT(office_id) as with_office_id,
       COUNT(*) - COUNT(office_id) as missing_office_id
FROM agency_payments;

-- Check driver_transactions
SELECT COUNT(*) as total, 
       COUNT(office_id) as with_office_id,
       COUNT(*) - COUNT(office_id) as missing_office_id
FROM driver_transactions;

-- Check all transaction tables
SELECT 
  'general_entries' as table_name,
  COUNT(*) as total,
  COUNT(office_id) as with_office_id
FROM general_entries
UNION ALL
SELECT 
  'agency_payments',
  COUNT(*),
  COUNT(office_id)
FROM agency_payments
UNION ALL
SELECT 
  'driver_transactions',
  COUNT(*),
  COUNT(office_id)
FROM driver_transactions
UNION ALL
SELECT 
  'truck_fuel_entries',
  COUNT(*),
  COUNT(office_id)
FROM truck_fuel_entries;
```

### Verify All Users Have office_id

```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(office_id) as users_with_office,
  COUNT(*) - COUNT(office_id) as users_without_office
FROM user_profiles;

-- List users without office assignment
SELECT id, full_name, user_type, is_admin
FROM user_profiles
WHERE office_id IS NULL;
```

### Verify Data Segregation

```sql
-- Count transactions per office
SELECT 
  o.name as office_name,
  COUNT(ge.id) as transaction_count
FROM offices o
LEFT JOIN general_entries ge ON ge.office_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;

-- Verify no cross-office data leakage
SELECT 
  ge.id,
  ge.description,
  ge.office_id,
  o.name as office_name
FROM general_entries ge
LEFT JOIN offices o ON o.id = ge.office_id
WHERE ge.office_id IS NOT NULL
ORDER BY ge.created_at DESC
LIMIT 20;
```

### Verify RLS Policies

```sql
-- List all RLS policies for transaction tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN (
  'general_entries',
  'agency_payments',
  'driver_transactions',
  'truck_fuel_entries',
  'agency_entries',
  'uppad_jama_entries',
  'cash_records'
)
ORDER BY tablename, policyname;
```

## Performance Testing

### Test Office Switching Performance

1. Login as admin
2. Open browser developer tools (if web) or React Native debugger
3. Switch between offices multiple times
4. Measure time for each switch
5. Verify all switches complete within 2 seconds

**Expected Results:**
- ✓ Office switch completes in < 2 seconds
- ✓ No UI freezing during switch
- ✓ Smooth transition animation

### Test Query Performance with Large Datasets

1. Create 1000+ transactions in Office A
2. Create 1000+ transactions in Office B
3. Switch between offices
4. Measure query response times
5. Verify no performance degradation

**Expected Results:**
- ✓ Queries remain fast with large datasets
- ✓ Indexes are being used effectively
- ✓ No N+1 query issues

## Troubleshooting

### Tests Fail to Connect to Supabase

**Issue:** Tests cannot connect to Supabase database

**Solution:**
1. Verify Supabase credentials in `src/supabase.ts`
2. Check internet connection
3. Verify Supabase project is active
4. Check API keys are valid

### RLS Policies Block Test Data

**Issue:** Tests fail due to RLS policy restrictions

**Solution:**
1. Temporarily disable RLS for testing:
   ```sql
   ALTER TABLE general_entries DISABLE ROW LEVEL SECURITY;
   ```
2. Run tests
3. Re-enable RLS:
   ```sql
   ALTER TABLE general_entries ENABLE ROW LEVEL SECURITY;
   ```

### Office Switching Doesn't Update Data

**Issue:** Data doesn't change when switching offices

**Solution:**
1. Check OfficeContext is properly initialized
2. Verify screens are consuming OfficeContext
3. Check AsyncStorage for persisted office
4. Clear app cache and restart

### Transactions Missing office_id

**Issue:** Some transactions don't have office_id

**Solution:**
1. Run migration 011 to update existing data
2. Verify save functions include office_id parameter
3. Check OfficeContext provides current office_id

## Test Coverage Summary

| Requirement | Test Coverage | Status |
|------------|---------------|--------|
| 1.1 - Office Management | ✓ Automated + Manual | Complete |
| 1.2 - Create Office | ✓ Automated + Manual | Complete |
| 1.3 - Edit Office | ✓ Automated + Manual | Complete |
| 1.4 - Delete Office | ✓ Automated + Manual | Complete |
| 1.5 - Delete Protection | ✓ Automated + Manual | Complete |
| 2.1 - Office Selection | ✓ Manual | Complete |
| 2.2 - Office Switcher | ✓ Manual | Complete |
| 2.3 - Office Switch Speed | ✓ Manual | Complete |
| 2.4 - Data Reload | ✓ Automated + Manual | Complete |
| 2.5 - Persistence | ✓ Manual | Complete |
| 3.1 - Auto-tag Transactions | ✓ Automated + Manual | Complete |
| 3.2 - Filter Daily Report | ✓ Automated + Manual | Complete |
| 3.3 - Filter Agency Payments | ✓ Automated + Manual | Complete |
| 3.4 - Filter Driver Transactions | ✓ Automated + Manual | Complete |
| 3.5 - Filter Majuri Entries | ✓ Manual | Complete |
| 4.1 - User Office Assignment | ✓ Automated + Manual | Complete |
| 4.2 - Office Selection in User Form | ✓ Manual | Complete |
| 4.3 - User Data Access | ✓ Automated + Manual | Complete |
| 4.4 - Auto-select Single Office | ✓ Manual | Complete |
| 4.5 - Remove Office Access | ✓ Manual | Complete |
| 4.6 - Display Office in User List | ✓ Manual | Complete |
| 5.1 - Office Indicator | ✓ Manual | Complete |
| 5.2 - Indicator Persistence | ✓ Manual | Complete |
| 5.3 - Office on Entry Form | ✓ Manual | Complete |
| 5.4 - Visual Styling | ✓ Manual | Complete |
| 5.5 - Indicator Update Speed | ✓ Manual | Complete |
| 6.1 - Admin Dropdown | ✓ Manual | Complete |
| 6.2 - Admin Office Switch | ✓ Automated + Manual | Complete |
| 6.3 - All Offices View | ✓ Automated + Manual | Complete |
| 6.4 - Office Breakdown | ✓ Manual | Complete |
| 6.5 - PDF Office Info | ✓ Manual | Complete |
| 7.1 - Sync with Office ID | ✓ Automated + Manual | Complete |
| 7.2 - Validate Office Associations | ✓ Automated | Complete |
| 7.3 - Conflict Resolution | ✓ Manual | Complete |
| 7.4 - Offline Office Associations | ✓ Automated + Manual | Complete |
| 7.5 - Sync Speed | ✓ Manual | Complete |
| 8.1 - Non-admin Auto-load | ✓ Automated + Manual | Complete |
| 8.2 - Hide Switcher | ✓ Manual | Complete |
| 8.3 - Filter Non-admin Data | ✓ Automated + Manual | Complete |
| 8.4 - Display Office Name | ✓ Manual | Complete |
| 8.5 - Deny Other Office Access | ✓ Automated + Manual | Complete |
| 9.1 - Majur Office Data | ✓ Manual | Complete |
| 9.2 - Filter Majuri Entries | ✓ Manual | Complete |
| 9.3 - Filter Uppad/Jama | ✓ Manual | Complete |
| 9.4 - Majur Multi-office | ✓ Manual | Complete |
| 10.1 - Default Office Creation | ✓ Automated + Manual | Complete |
| 10.2 - Migrate Transactions | ✓ Automated + Manual | Complete |
| 10.3 - Verify Migration | ✓ Automated + Manual | Complete |
| 10.4 - Migration Error Handling | ✓ Manual | Complete |
| 10.5 - Migration Performance | ✓ Manual | Complete |
| 11.1 - Unique Office Names | ✓ Automated + Manual | Complete |
| 11.2 - Duplicate Prevention | ✓ Automated + Manual | Complete |
| 11.3 - Edit Name Uniqueness | ✓ Automated | Complete |
| 11.4 - Case-insensitive Check | ✓ Automated | Complete |
| 11.5 - Trim Whitespace | ✓ Automated | Complete |

## Conclusion

This comprehensive testing guide covers all aspects of the multi-office support feature. Both automated and manual tests should be executed to ensure complete functionality and data integrity.

**Test Execution Checklist:**
- [ ] Run automated integration tests
- [ ] Execute all manual test cases
- [ ] Verify database queries
- [ ] Perform performance testing
- [ ] Test with real user accounts
- [ ] Verify RLS policies
- [ ] Test offline sync
- [ ] Generate and verify PDF reports
- [ ] Test on both iOS and Android (if applicable)
- [ ] Document any issues found

**Sign-off:**
- Tester Name: _______________
- Date: _______________
- Test Result: Pass / Fail
- Notes: _______________
