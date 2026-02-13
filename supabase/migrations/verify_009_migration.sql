-- Verification Script for Migration 009: Multi-Office Support
-- Run this script to verify that the migration was applied successfully

-- ============================================================================
-- 1. CHECK IF OFFICES TABLE EXISTS
-- ============================================================================

SELECT 
    'offices table' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'offices'
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- ============================================================================
-- 2. CHECK IF OFFICE_ID COLUMNS EXIST IN ALL TABLES
-- ============================================================================

SELECT 
    'office_id columns' as check_name,
    CASE 
        WHEN COUNT(*) = 9 THEN '✓ PASS (9/9 columns found)'
        ELSE '✗ FAIL (' || COUNT(*) || '/9 columns found)'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'office_id'
AND table_name IN (
    'user_profiles',
    'agency_payments',
    'agency_majuri',
    'driver_transactions',
    'truck_fuel_entries',
    'general_entries',
    'agency_entries',
    'uppad_jama_entries',
    'cash_records'
);

-- ============================================================================
-- 3. LIST ALL TABLES WITH OFFICE_ID COLUMN
-- ============================================================================

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'office_id'
ORDER BY table_name;

-- ============================================================================
-- 4. CHECK IF INDEXES EXIST
-- ============================================================================

SELECT 
    'office_id indexes' as check_name,
    CASE 
        WHEN COUNT(*) >= 10 THEN '✓ PASS (' || COUNT(*) || ' indexes found)'
        ELSE '✗ FAIL (' || COUNT(*) || ' indexes found, expected 10+)'
    END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE '%office%';

-- ============================================================================
-- 5. LIST ALL OFFICE-RELATED INDEXES
-- ============================================================================

SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (indexname LIKE '%office%' OR indexdef LIKE '%office%')
ORDER BY tablename, indexname;

-- ============================================================================
-- 6. CHECK IF RLS IS ENABLED ON OFFICES TABLE
-- ============================================================================

SELECT 
    'RLS on offices table' as check_name,
    CASE 
        WHEN relrowsecurity = true THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM pg_class 
WHERE relname = 'offices' 
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- 7. CHECK IF RLS POLICIES EXIST
-- ============================================================================

SELECT 
    'RLS policies' as check_name,
    CASE 
        WHEN COUNT(*) = 4 THEN '✓ PASS (4/4 policies found)'
        ELSE '✗ FAIL (' || COUNT(*) || '/4 policies found)'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'offices';

-- ============================================================================
-- 8. LIST ALL RLS POLICIES ON OFFICES TABLE
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'offices'
ORDER BY policyname;

-- ============================================================================
-- 9. CHECK IF TRIGGER EXISTS
-- ============================================================================

SELECT 
    'update_offices_updated_at trigger' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE event_object_schema = 'public' 
            AND event_object_table = 'offices'
            AND trigger_name = 'update_offices_updated_at'
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- ============================================================================
-- 10. CHECK FOREIGN KEY CONSTRAINTS
-- ============================================================================

SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'office_id'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- 11. SUMMARY
-- ============================================================================

SELECT 
    '=== MIGRATION VERIFICATION SUMMARY ===' as summary;

SELECT 
    'Total tables with office_id' as metric,
    COUNT(DISTINCT table_name)::text as value
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'office_id';

SELECT 
    'Total indexes on office_id' as metric,
    COUNT(*)::text as value
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE '%office_id%';

SELECT 
    'RLS policies on offices' as metric,
    COUNT(*)::text as value
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'offices';

SELECT 
    'Foreign key constraints' as metric,
    COUNT(*)::text as value
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'office_id'
AND tc.table_schema = 'public';
