-- Verification Script for Migration 011: Data Migration to Default Office
-- This script verifies that all existing data has been properly migrated

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

\echo ''
\echo '========================================'
\echo 'Data Migration Verification'
\echo '========================================'
\echo ''

-- Get default office info
\echo '1. Default Office Information:'
\echo '------------------------------'
SELECT 
    id,
    name,
    address,
    is_active,
    created_at
FROM public.offices
WHERE name = 'Prem Darvaja Office';

\echo ''
\echo '2. User Profiles with NULL office_id:'
\echo '--------------------------------------'
SELECT 
    COUNT(*) as null_office_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ PASS - All user profiles have office_id'
        ELSE '✗ FAIL - Some user profiles missing office_id'
    END as status
FROM public.user_profiles
WHERE office_id IS NULL;

\echo ''
\echo '3. User Profiles by Office:'
\echo '---------------------------'
SELECT 
    o.name as office_name,
    COUNT(up.id) as user_count
FROM public.offices o
LEFT JOIN public.user_profiles up ON up.office_id = o.id
GROUP BY o.id, o.name
ORDER BY user_count DESC;

\echo ''
\echo '4. Transaction Tables - NULL office_id Check:'
\echo '----------------------------------------------'

-- Agency Payments
SELECT 
    'agency_payments' as table_name,
    COUNT(*) as total_records,
    COUNT(office_id) as records_with_office,
    COUNT(*) - COUNT(office_id) as records_without_office,
    CASE 
        WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM public.agency_payments

UNION ALL

-- Agency Majuri
SELECT 
    'agency_majuri' as table_name,
    COUNT(*) as total_records,
    COUNT(office_id) as records_with_office,
    COUNT(*) - COUNT(office_id) as records_without_office,
    CASE 
        WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM public.agency_majuri

UNION ALL

-- Driver Transactions
SELECT 
    'driver_transactions' as table_name,
    COUNT(*) as total_records,
    COUNT(office_id) as records_with_office,
    COUNT(*) - COUNT(office_id) as records_without_office,
    CASE 
        WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM public.driver_transactions

UNION ALL

-- Truck Fuel Entries
SELECT 
    'truck_fuel_entries' as table_name,
    COUNT(*) as total_records,
    COUNT(office_id) as records_with_office,
    COUNT(*) - COUNT(office_id) as records_without_office,
    CASE 
        WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM public.truck_fuel_entries

UNION ALL

-- General Entries
SELECT 
    'general_entries' as table_name,
    COUNT(*) as total_records,
    COUNT(office_id) as records_with_office,
    COUNT(*) - COUNT(office_id) as records_without_office,
    CASE 
        WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM public.general_entries

UNION ALL

-- Agency Entries
SELECT 
    'agency_entries' as table_name,
    COUNT(*) as total_records,
    COUNT(office_id) as records_with_office,
    COUNT(*) - COUNT(office_id) as records_without_office,
    CASE 
        WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM public.agency_entries

UNION ALL

-- Uppad Jama Entries
SELECT 
    'uppad_jama_entries' as table_name,
    COUNT(*) as total_records,
    COUNT(office_id) as records_with_office,
    COUNT(*) - COUNT(office_id) as records_without_office,
    CASE 
        WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM public.uppad_jama_entries

UNION ALL

-- Cash Records
SELECT 
    'cash_records' as table_name,
    COUNT(*) as total_records,
    COUNT(office_id) as records_with_office,
    COUNT(*) - COUNT(office_id) as records_without_office,
    CASE 
        WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM public.cash_records

ORDER BY table_name;

\echo ''
\echo '5. Records by Office (Sample from each table):'
\echo '-----------------------------------------------'
SELECT 
    o.name as office_name,
    COUNT(DISTINCT ap.id) as agency_payments,
    COUNT(DISTINCT am.id) as agency_majuri,
    COUNT(DISTINCT dt.id) as driver_transactions,
    COUNT(DISTINCT tf.id) as truck_fuel,
    COUNT(DISTINCT ge.id) as general_entries,
    COUNT(DISTINCT ae.id) as agency_entries,
    COUNT(DISTINCT uj.id) as uppad_jama,
    COUNT(DISTINCT cr.id) as cash_records
FROM public.offices o
LEFT JOIN public.agency_payments ap ON ap.office_id = o.id
LEFT JOIN public.agency_majuri am ON am.office_id = o.id
LEFT JOIN public.driver_transactions dt ON dt.office_id = o.id
LEFT JOIN public.truck_fuel_entries tf ON tf.office_id = o.id
LEFT JOIN public.general_entries ge ON ge.office_id = o.id
LEFT JOIN public.agency_entries ae ON ae.office_id = o.id
LEFT JOIN public.uppad_jama_entries uj ON uj.office_id = o.id
LEFT JOIN public.cash_records cr ON cr.office_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;

\echo ''
\echo '6. Data Integrity Check:'
\echo '------------------------'
-- Check for orphaned records (office_id references non-existent office)
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as orphaned_records
FROM public.user_profiles
WHERE office_id IS NOT NULL 
  AND office_id NOT IN (SELECT id FROM public.offices)

UNION ALL

SELECT 
    'agency_payments' as table_name,
    COUNT(*) as orphaned_records
FROM public.agency_payments
WHERE office_id IS NOT NULL 
  AND office_id NOT IN (SELECT id FROM public.offices)

UNION ALL

SELECT 
    'agency_majuri' as table_name,
    COUNT(*) as orphaned_records
FROM public.agency_majuri
WHERE office_id IS NOT NULL 
  AND office_id NOT IN (SELECT id FROM public.offices)

UNION ALL

SELECT 
    'driver_transactions' as table_name,
    COUNT(*) as orphaned_records
FROM public.driver_transactions
WHERE office_id IS NOT NULL 
  AND office_id NOT IN (SELECT id FROM public.offices)

UNION ALL

SELECT 
    'truck_fuel_entries' as table_name,
    COUNT(*) as orphaned_records
FROM public.truck_fuel_entries
WHERE office_id IS NOT NULL 
  AND office_id NOT IN (SELECT id FROM public.offices)

UNION ALL

SELECT 
    'general_entries' as table_name,
    COUNT(*) as orphaned_records
FROM public.general_entries
WHERE office_id IS NOT NULL 
  AND office_id NOT IN (SELECT id FROM public.offices)

UNION ALL

SELECT 
    'agency_entries' as table_name,
    COUNT(*) as orphaned_records
FROM public.agency_entries
WHERE office_id IS NOT NULL 
  AND office_id NOT IN (SELECT id FROM public.offices)

UNION ALL

SELECT 
    'uppad_jama_entries' as table_name,
    COUNT(*) as orphaned_records
FROM public.uppad_jama_entries
WHERE office_id IS NOT NULL 
  AND office_id NOT IN (SELECT id FROM public.offices)

UNION ALL

SELECT 
    'cash_records' as table_name,
    COUNT(*) as orphaned_records
FROM public.cash_records
WHERE office_id IS NOT NULL 
  AND office_id NOT IN (SELECT id FROM public.offices);

\echo ''
\echo '========================================'
\echo 'Verification Complete'
\echo '========================================'
\echo ''
\echo 'Expected Results:'
\echo '  - All tables should show ✓ PASS'
\echo '  - No NULL office_id values'
\echo '  - No orphaned records (0 for all tables)'
\echo '  - All records assigned to "Prem Darvaja Office"'
\echo ''
