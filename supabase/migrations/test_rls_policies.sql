-- Test Script for RLS Policies
-- This script helps verify that Row Level Security policies are working correctly

-- ============================================================================
-- SETUP: Create Test Data
-- ============================================================================

-- Note: Run this section first to create test data
-- You'll need actual user IDs from your user_profiles table

-- Get office IDs
DO $$
DECLARE
  office1_id UUID;
  office2_id UUID;
BEGIN
  -- Get first office ID
  SELECT id INTO office1_id FROM offices ORDER BY created_at LIMIT 1;
  
  RAISE NOTICE 'Office 1 ID: %', office1_id;
  
  -- If you have a second office, get its ID
  SELECT id INTO office2_id FROM offices ORDER BY created_at OFFSET 1 LIMIT 1;
  
  IF office2_id IS NOT NULL THEN
    RAISE NOTICE 'Office 2 ID: %', office2_id;
  ELSE
    RAISE NOTICE 'Only one office exists. Create a second office for full testing.';
  END IF;
END $$;

-- ============================================================================
-- TEST 1: Verify RLS is Enabled
-- ============================================================================

SELECT 
  '=== TEST 1: RLS Enabled Status ===' as test_name;

SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
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

-- ============================================================================
-- TEST 2: Verify Policy Count
-- ============================================================================

SELECT 
  '=== TEST 2: Policy Count Per Table ===' as test_name;

SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ CORRECT (4 policies)'
    ELSE '❌ INCORRECT (expected 4)'
  END as status
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
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- TEST 3: List All Policies
-- ============================================================================

SELECT 
  '=== TEST 3: All RLS Policies ===' as test_name;

SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN '👁️ Read'
    WHEN cmd = 'INSERT' THEN '➕ Create'
    WHEN cmd = 'UPDATE' THEN '✏️ Update'
    WHEN cmd = 'DELETE' THEN '🗑️ Delete'
    ELSE cmd
  END as operation_type
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

-- ============================================================================
-- TEST 4: Check User Office Assignments
-- ============================================================================

SELECT 
  '=== TEST 4: User Office Assignments ===' as test_name;

SELECT 
  up.id,
  up.full_name,
  up.is_admin,
  up.user_type,
  up.office_id,
  o.name as office_name,
  CASE 
    WHEN up.office_id IS NULL THEN '❌ NO OFFICE ASSIGNED'
    WHEN up.is_admin THEN '✅ ADMIN (can access all offices)'
    ELSE '✅ ASSIGNED TO OFFICE'
  END as status
FROM user_profiles up
LEFT JOIN offices o ON up.office_id = o.id
ORDER BY up.is_admin DESC, up.full_name;

-- ============================================================================
-- TEST 5: Check Transaction Data Distribution
-- ============================================================================

SELECT 
  '=== TEST 5: Transaction Distribution by Office ===' as test_name;

-- Agency Payments
SELECT 
  'agency_payments' as table_name,
  o.name as office_name,
  COUNT(*) as transaction_count
FROM agency_payments ap
LEFT JOIN offices o ON ap.office_id = o.id
GROUP BY o.name
ORDER BY o.name;

-- Agency Majuri
SELECT 
  'agency_majuri' as table_name,
  o.name as office_name,
  COUNT(*) as transaction_count
FROM agency_majuri am
LEFT JOIN offices o ON am.office_id = o.id
GROUP BY o.name
ORDER BY o.name;

-- Driver Transactions
SELECT 
  'driver_transactions' as table_name,
  o.name as office_name,
  COUNT(*) as transaction_count
FROM driver_transactions dt
LEFT JOIN offices o ON dt.office_id = o.id
GROUP BY o.name
ORDER BY o.name;

-- General Entries
SELECT 
  'general_entries' as table_name,
  o.name as office_name,
  COUNT(*) as transaction_count
FROM general_entries ge
LEFT JOIN offices o ON ge.office_id = o.id
GROUP BY o.name
ORDER BY o.name;

-- Cash Records
SELECT 
  'cash_records' as table_name,
  o.name as office_name,
  COUNT(*) as transaction_count
FROM cash_records cr
LEFT JOIN offices o ON cr.office_id = o.id
GROUP BY o.name
ORDER BY o.name;

-- ============================================================================
-- TEST 6: Verify Transactions Without Office Assignment
-- ============================================================================

SELECT 
  '=== TEST 6: Transactions Without Office (Should be 0) ===' as test_name;

SELECT 
  'agency_payments' as table_name,
  COUNT(*) as unassigned_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ ALL ASSIGNED'
    ELSE '❌ SOME UNASSIGNED'
  END as status
FROM agency_payments
WHERE office_id IS NULL

UNION ALL

SELECT 
  'agency_majuri',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ ALL ASSIGNED' ELSE '❌ SOME UNASSIGNED' END
FROM agency_majuri
WHERE office_id IS NULL

UNION ALL

SELECT 
  'driver_transactions',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ ALL ASSIGNED' ELSE '❌ SOME UNASSIGNED' END
FROM driver_transactions
WHERE office_id IS NULL

UNION ALL

SELECT 
  'truck_fuel_entries',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ ALL ASSIGNED' ELSE '❌ SOME UNASSIGNED' END
FROM truck_fuel_entries
WHERE office_id IS NULL

UNION ALL

SELECT 
  'general_entries',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ ALL ASSIGNED' ELSE '❌ SOME UNASSIGNED' END
FROM general_entries
WHERE office_id IS NULL

UNION ALL

SELECT 
  'agency_entries',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ ALL ASSIGNED' ELSE '❌ SOME UNASSIGNED' END
FROM agency_entries
WHERE office_id IS NULL

UNION ALL

SELECT 
  'uppad_jama_entries',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ ALL ASSIGNED' ELSE '❌ SOME UNASSIGNED' END
FROM uppad_jama_entries
WHERE office_id IS NULL

UNION ALL

SELECT 
  'cash_records',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ ALL ASSIGNED' ELSE '❌ SOME UNASSIGNED' END
FROM cash_records
WHERE office_id IS NULL;

-- ============================================================================
-- TEST 7: Summary Report
-- ============================================================================

SELECT 
  '=== TEST 7: Summary Report ===' as test_name;

SELECT 
  'Total Offices' as metric,
  COUNT(*)::text as value
FROM offices
WHERE is_active = true

UNION ALL

SELECT 
  'Total Users',
  COUNT(*)::text
FROM user_profiles
WHERE is_active = true

UNION ALL

SELECT 
  'Admin Users',
  COUNT(*)::text
FROM user_profiles
WHERE is_admin = true AND is_active = true

UNION ALL

SELECT 
  'Users with Office Assigned',
  COUNT(*)::text
FROM user_profiles
WHERE office_id IS NOT NULL AND is_active = true

UNION ALL

SELECT 
  'Users without Office',
  COUNT(*)::text
FROM user_profiles
WHERE office_id IS NULL AND is_active = true

UNION ALL

SELECT 
  'Total RLS Policies',
  COUNT(*)::text
FROM pg_policies
WHERE tablename IN (
  'agency_payments', 'agency_majuri', 'driver_transactions',
  'truck_fuel_entries', 'general_entries', 'agency_entries',
  'uppad_jama_entries', 'cash_records'
);

-- ============================================================================
-- MANUAL TESTING INSTRUCTIONS
-- ============================================================================

/*
MANUAL TESTING STEPS:

1. Test as Admin User:
   - Login to the app as an admin user
   - Verify you can see all transactions from all offices
   - Try switching offices (if implemented)
   - Create a transaction and verify it's saved with correct office_id

2. Test as Regular User:
   - Login as a non-admin user
   - Verify you only see transactions from your assigned office
   - Try to access another office's data (should be blocked)
   - Create a transaction and verify it's saved with your office_id

3. Test as Majur User:
   - Login as a majur user
   - Verify majuri dashboard shows only your office's data
   - Verify uppad/jama entries are filtered by your office

4. Test Data Segregation:
   - Create test data in Office A
   - Switch to Office B (as admin)
   - Verify Office A data is not visible
   - Switch back to Office A
   - Verify data reappears

5. Test Policy Enforcement:
   - As regular user, try to query another office's data directly
   - Should return empty result or error
   - As admin, same query should return data

EXPECTED RESULTS:
✅ All tables have RLS enabled
✅ Each table has 4 policies (SELECT, INSERT, UPDATE, DELETE)
✅ Admin users can access all data
✅ Regular users can only access their office's data
✅ All transactions have office_id assigned
✅ No unauthorized access to other offices' data
*/
