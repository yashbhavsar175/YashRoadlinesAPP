-- ============================================================================
-- Migration 011: Migrate Existing Data to Default Office
-- ============================================================================
-- This script can be run directly in Supabase Dashboard SQL Editor
-- It updates all existing transactions and user profiles with default office_id
-- Requirements: 9.2, 9.3, 9.4, 10.2, 10.3
-- ============================================================================

-- STEP 1: Run the migration
DO $$
DECLARE
    v_default_office_id UUID;
    v_user_profiles_updated INTEGER;
    v_agency_payments_updated INTEGER;
    v_agency_majuri_updated INTEGER;
    v_driver_transactions_updated INTEGER;
    v_truck_fuel_entries_updated INTEGER;
    v_general_entries_updated INTEGER;
    v_agency_entries_updated INTEGER;
    v_uppad_jama_entries_updated INTEGER;
    v_cash_records_updated INTEGER;
    v_total_updated INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting Data Migration to Default Office';
    RAISE NOTICE '========================================';
    
    -- Get the default office ID
    SELECT id INTO v_default_office_id
    FROM public.offices
    WHERE name = 'Prem Darvaja Office'
    LIMIT 1;
    
    IF v_default_office_id IS NULL THEN
        RAISE EXCEPTION 'Default office "Prem Darvaja Office" not found. Please run Task 2 first.';
    END IF;
    
    RAISE NOTICE 'Default Office ID: %', v_default_office_id;
    
    -- Update user_profiles
    RAISE NOTICE 'Updating user_profiles...';
    UPDATE public.user_profiles
    SET office_id = v_default_office_id
    WHERE office_id IS NULL;
    GET DIAGNOSTICS v_user_profiles_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_user_profiles_updated;
    RAISE NOTICE '  ✓ Updated % user profiles', v_user_profiles_updated;
    
    -- Update agency_payments
    UPDATE public.agency_payments
    SET office_id = v_default_office_id
    WHERE office_id IS NULL;
    GET DIAGNOSTICS v_agency_payments_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_agency_payments_updated;
    RAISE NOTICE '  ✓ Updated % agency_payments', v_agency_payments_updated;
    
    -- Update agency_majuri
    UPDATE public.agency_majuri
    SET office_id = v_default_office_id
    WHERE office_id IS NULL;
    GET DIAGNOSTICS v_agency_majuri_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_agency_majuri_updated;
    RAISE NOTICE '  ✓ Updated % agency_majuri', v_agency_majuri_updated;
    
    -- Update driver_transactions
    UPDATE public.driver_transactions
    SET office_id = v_default_office_id
    WHERE office_id IS NULL;
    GET DIAGNOSTICS v_driver_transactions_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_driver_transactions_updated;
    RAISE NOTICE '  ✓ Updated % driver_transactions', v_driver_transactions_updated;
    
    -- Update truck_fuel_entries
    UPDATE public.truck_fuel_entries
    SET office_id = v_default_office_id
    WHERE office_id IS NULL;
    GET DIAGNOSTICS v_truck_fuel_entries_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_truck_fuel_entries_updated;
    RAISE NOTICE '  ✓ Updated % truck_fuel_entries', v_truck_fuel_entries_updated;
    
    -- Update general_entries
    UPDATE public.general_entries
    SET office_id = v_default_office_id
    WHERE office_id IS NULL;
    GET DIAGNOSTICS v_general_entries_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_general_entries_updated;
    RAISE NOTICE '  ✓ Updated % general_entries', v_general_entries_updated;
    
    -- Update agency_entries
    UPDATE public.agency_entries
    SET office_id = v_default_office_id
    WHERE office_id IS NULL;
    GET DIAGNOSTICS v_agency_entries_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_agency_entries_updated;
    RAISE NOTICE '  ✓ Updated % agency_entries', v_agency_entries_updated;
    
    -- Update uppad_jama_entries
    UPDATE public.uppad_jama_entries
    SET office_id = v_default_office_id
    WHERE office_id IS NULL;
    GET DIAGNOSTICS v_uppad_jama_entries_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_uppad_jama_entries_updated;
    RAISE NOTICE '  ✓ Updated % uppad_jama_entries', v_uppad_jama_entries_updated;
    
    -- Update cash_records
    UPDATE public.cash_records
    SET office_id = v_default_office_id
    WHERE office_id IS NULL;
    GET DIAGNOSTICS v_cash_records_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_cash_records_updated;
    RAISE NOTICE '  ✓ Updated % cash_records', v_cash_records_updated;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Summary';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total records updated: %', v_total_updated;
    RAISE NOTICE '';
    RAISE NOTICE 'Breakdown:';
    RAISE NOTICE '  - User Profiles: %', v_user_profiles_updated;
    RAISE NOTICE '  - Agency Payments: %', v_agency_payments_updated;
    RAISE NOTICE '  - Agency Majuri: %', v_agency_majuri_updated;
    RAISE NOTICE '  - Driver Transactions: %', v_driver_transactions_updated;
    RAISE NOTICE '  - Truck Fuel Entries: %', v_truck_fuel_entries_updated;
    RAISE NOTICE '  - General Entries: %', v_general_entries_updated;
    RAISE NOTICE '  - Agency Entries: %', v_agency_entries_updated;
    RAISE NOTICE '  - Uppad Jama Entries: %', v_uppad_jama_entries_updated;
    RAISE NOTICE '  - Cash Records: %', v_cash_records_updated;
    RAISE NOTICE '';
    RAISE NOTICE '✓ Data migration completed successfully!';
    
END $$;

-- ============================================================================
-- STEP 2: Verification Queries
-- ============================================================================

-- Check default office
SELECT 
    '1. Default Office' as check_name,
    id,
    name,
    address,
    is_active
FROM public.offices
WHERE name = 'Prem Darvaja Office';

-- Check for NULL office_id in user_profiles
SELECT 
    '2. User Profiles NULL Check' as check_name,
    COUNT(*) as null_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ PASS - All user profiles have office_id'
        ELSE '✗ FAIL - Some user profiles missing office_id'
    END as status
FROM public.user_profiles
WHERE office_id IS NULL;

-- Check transaction tables for NULL office_id
SELECT 
    '3. Transaction Tables NULL Check' as check_name,
    'agency_payments' as table_name,
    COUNT(*) as total_records,
    COUNT(office_id) as records_with_office,
    COUNT(*) - COUNT(office_id) as null_count,
    CASE 
        WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM public.agency_payments

UNION ALL

SELECT 
    '3. Transaction Tables NULL Check',
    'agency_majuri',
    COUNT(*),
    COUNT(office_id),
    COUNT(*) - COUNT(office_id),
    CASE WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM public.agency_majuri

UNION ALL

SELECT 
    '3. Transaction Tables NULL Check',
    'driver_transactions',
    COUNT(*),
    COUNT(office_id),
    COUNT(*) - COUNT(office_id),
    CASE WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM public.driver_transactions

UNION ALL

SELECT 
    '3. Transaction Tables NULL Check',
    'truck_fuel_entries',
    COUNT(*),
    COUNT(office_id),
    COUNT(*) - COUNT(office_id),
    CASE WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM public.truck_fuel_entries

UNION ALL

SELECT 
    '3. Transaction Tables NULL Check',
    'general_entries',
    COUNT(*),
    COUNT(office_id),
    COUNT(*) - COUNT(office_id),
    CASE WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM public.general_entries

UNION ALL

SELECT 
    '3. Transaction Tables NULL Check',
    'agency_entries',
    COUNT(*),
    COUNT(office_id),
    COUNT(*) - COUNT(office_id),
    CASE WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM public.agency_entries

UNION ALL

SELECT 
    '3. Transaction Tables NULL Check',
    'uppad_jama_entries',
    COUNT(*),
    COUNT(office_id),
    COUNT(*) - COUNT(office_id),
    CASE WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM public.uppad_jama_entries

UNION ALL

SELECT 
    '3. Transaction Tables NULL Check',
    'cash_records',
    COUNT(*),
    COUNT(office_id),
    COUNT(*) - COUNT(office_id),
    CASE WHEN COUNT(*) - COUNT(office_id) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END
FROM public.cash_records

ORDER BY table_name;

-- Summary by office
SELECT 
    '4. Records by Office' as check_name,
    o.name as office_name,
    COUNT(DISTINCT up.id) as user_profiles,
    COUNT(DISTINCT ap.id) as agency_payments,
    COUNT(DISTINCT am.id) as agency_majuri,
    COUNT(DISTINCT dt.id) as driver_transactions,
    COUNT(DISTINCT tf.id) as truck_fuel,
    COUNT(DISTINCT ge.id) as general_entries,
    COUNT(DISTINCT ae.id) as agency_entries,
    COUNT(DISTINCT uj.id) as uppad_jama,
    COUNT(DISTINCT cr.id) as cash_records
FROM public.offices o
LEFT JOIN public.user_profiles up ON up.office_id = o.id
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

-- ============================================================================
-- Expected Results:
-- ============================================================================
-- 1. Default office "Prem Darvaja Office" should be displayed
-- 2. User Profiles NULL Check should show: ✓ PASS - All user profiles have office_id
-- 3. All transaction tables should show: ✓ PASS
-- 4. Records by Office should show all records assigned to "Prem Darvaja Office"
-- ============================================================================
