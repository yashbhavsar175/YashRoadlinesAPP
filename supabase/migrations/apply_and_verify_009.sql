-- ============================================================================
-- APPLY MIGRATION 009 AND CREATE DEFAULT OFFICE
-- ============================================================================
-- This script:
-- 1. Applies the migration 009 (multi-office support)
-- 2. Inserts the default office "Prem Darvaja Office"
-- 3. Verifies the migration was successful
-- ============================================================================

\echo '========================================='
\echo 'STEP 1: Applying Migration 009'
\echo '========================================='

\i 009_add_multi_office_support.sql

\echo ''
\echo '========================================='
\echo 'STEP 2: Creating Default Office'
\echo '========================================='

-- Insert default office "Prem Darvaja Office"
INSERT INTO public.offices (name, address, is_active)
VALUES ('Prem Darvaja Office', 'Prem Darvaja, Ahmedabad', true)
ON CONFLICT (name) DO NOTHING;

-- Display the created office
SELECT 
    id,
    name,
    address,
    is_active,
    created_at
FROM public.offices
WHERE name = 'Prem Darvaja Office';

\echo ''
\echo '========================================='
\echo 'STEP 3: Verification'
\echo '========================================='

\i verify_009_migration.sql

\echo ''
\echo '========================================='
\echo 'STEP 4: Check Default Office'
\echo '========================================='

-- Verify default office exists
SELECT 
    'Default office exists' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.offices 
            WHERE name = 'Prem Darvaja Office'
        ) THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status;

-- Display all offices
SELECT 
    '=== ALL OFFICES ===' as info;

SELECT 
    id,
    name,
    address,
    is_active,
    created_at
FROM public.offices
ORDER BY created_at;

\echo ''
\echo '========================================='
\echo 'Migration 009 Applied Successfully!'
\echo '========================================='
\echo 'Next Steps:'
\echo '1. Run the data migration script (Task 4) to update existing records'
\echo '2. Deploy application code changes'
\echo '========================================='
