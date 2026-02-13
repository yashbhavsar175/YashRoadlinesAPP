-- Migration: Migrate Existing Data to Prem Darwaja(Main Office)
-- Update all NULL office_id entries to default office

DO $$
DECLARE
    default_office_id UUID;
    total_updated INTEGER := 0;
    count_updated INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migrating Data to Prem Darawaja(Main Office)';
    RAISE NOTICE '========================================';
    
    -- Get the office ID for "Prem Darawaja(Main Office)"
    SELECT id INTO default_office_id 
    FROM public.offices 
    WHERE name = 'Prem Darawaja(Main Office)' 
    LIMIT 1;
    
    -- If not found, try "Main Office"
    IF default_office_id IS NULL THEN
        SELECT id INTO default_office_id 
        FROM public.offices 
        WHERE name = 'Main Office' 
        LIMIT 1;
    END IF;
    
    IF default_office_id IS NULL THEN
        RAISE EXCEPTION 'Default office not found. Please create "Prem Darawaja(Main Office)" first.';
    END IF;
    
    RAISE NOTICE 'Default Office ID: %', default_office_id;
    RAISE NOTICE '';
    
    -- Update general_entries
    UPDATE public.general_entries 
    SET office_id = default_office_id 
    WHERE office_id IS NULL;
    GET DIAGNOSTICS count_updated = ROW_COUNT;
    total_updated := total_updated + count_updated;
    RAISE NOTICE '✓ Updated % general_entries', count_updated;
    
    -- Update agency_entries
    UPDATE public.agency_entries 
    SET office_id = default_office_id 
    WHERE office_id IS NULL;
    GET DIAGNOSTICS count_updated = ROW_COUNT;
    total_updated := total_updated + count_updated;
    RAISE NOTICE '✓ Updated % agency_entries', count_updated;
    
    -- Update uppad_jama_entries
    UPDATE public.uppad_jama_entries 
    SET office_id = default_office_id 
    WHERE office_id IS NULL;
    GET DIAGNOSTICS count_updated = ROW_COUNT;
    total_updated := total_updated + count_updated;
    RAISE NOTICE '✓ Updated % uppad_jama_entries', count_updated;
    
    -- Update driver_transactions
    UPDATE public.driver_transactions 
    SET office_id = default_office_id 
    WHERE office_id IS NULL;
    GET DIAGNOSTICS count_updated = ROW_COUNT;
    total_updated := total_updated + count_updated;
    RAISE NOTICE '✓ Updated % driver_transactions', count_updated;
    
    -- Update agency_payments
    UPDATE public.agency_payments 
    SET office_id = default_office_id 
    WHERE office_id IS NULL;
    GET DIAGNOSTICS count_updated = ROW_COUNT;
    total_updated := total_updated + count_updated;
    RAISE NOTICE '✓ Updated % agency_payments', count_updated;
    
    -- Update agency_majuri
    UPDATE public.agency_majuri 
    SET office_id = default_office_id 
    WHERE office_id IS NULL;
    GET DIAGNOSTICS count_updated = ROW_COUNT;
    total_updated := total_updated + count_updated;
    RAISE NOTICE '✓ Updated % agency_majuri', count_updated;
    
    -- Update truck_fuel_entries
    UPDATE public.truck_fuel_entries 
    SET office_id = default_office_id 
    WHERE office_id IS NULL;
    GET DIAGNOSTICS count_updated = ROW_COUNT;
    total_updated := total_updated + count_updated;
    RAISE NOTICE '✓ Updated % truck_fuel_entries', count_updated;
    
    -- Update cash_records
    UPDATE public.cash_records 
    SET office_id = default_office_id 
    WHERE office_id IS NULL;
    GET DIAGNOSTICS count_updated = ROW_COUNT;
    total_updated := total_updated + count_updated;
    RAISE NOTICE '✓ Updated % cash_records', count_updated;
    
    -- Update user_profiles
    UPDATE public.user_profiles 
    SET office_id = default_office_id 
    WHERE office_id IS NULL;
    GET DIAGNOSTICS count_updated = ROW_COUNT;
    total_updated := total_updated + count_updated;
    RAISE NOTICE '✓ Updated % user_profiles', count_updated;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total records updated: %', total_updated;
    RAISE NOTICE '✓ Migration completed successfully!';
    RAISE NOTICE '========================================';
END $$;
