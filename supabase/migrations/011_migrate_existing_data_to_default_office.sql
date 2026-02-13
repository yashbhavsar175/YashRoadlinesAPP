-- Migration 011: Migrate Existing Data to Default Office
-- This migration updates all existing transactions and user profiles with the default office_id
-- Requirements: 9.2, 9.3, 9.4, 10.2, 10.3

-- ============================================================================
-- IMPORTANT: This script assumes migration 009 and Task 2 have been completed
-- - offices table exists
-- - Default office "Prem Darvaja Office" exists
-- - All transaction tables have office_id column
-- - user_profiles table has office_id column
-- ============================================================================

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
    -- ========================================================================
    -- STEP 1: Get the default office ID
    -- ========================================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting Data Migration to Default Office';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    SELECT id INTO v_default_office_id
    FROM public.offices
    WHERE name = 'Prem Darvaja Office'
    LIMIT 1;
    
    IF v_default_office_id IS NULL THEN
        RAISE EXCEPTION 'Default office "Prem Darvaja Office" not found. Please run Task 2 first.';
    END IF;
    
    RAISE NOTICE 'Default Office ID: %', v_default_office_id;
    RAISE NOTICE '';
    
    -- ========================================================================
    -- STEP 2: Update user_profiles with default office_id
    -- ========================================================================
    RAISE NOTICE 'Updating user_profiles...';
    
    UPDATE public.user_profiles
    SET office_id = v_default_office_id
    WHERE office_id IS NULL;
    
    GET DIAGNOSTICS v_user_profiles_updated = ROW_COUNT;
    v_total_updated := v_total_updated + v_user_profiles_updated;
    
    RAISE NOTICE '  ✓ Updated % user profiles', v_user_profiles_updated;
    RAISE NOTICE '';
    
    -- ========================================================================
    -- STEP 3: Update transaction tables with default office_id
    -- ========================================================================
    RAISE NOTICE 'Updating transaction tables...';
    
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
    RAISE NOTICE '';
    
END $$;
