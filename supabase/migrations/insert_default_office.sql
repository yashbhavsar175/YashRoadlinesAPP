-- ============================================================================
-- INSERT DEFAULT OFFICE
-- ============================================================================
-- This script inserts the default office "Prem Darvaja Office"
-- Run this after applying migration 009
-- ============================================================================

-- Insert default office
INSERT INTO public.offices (name, address, is_active)
VALUES ('Prem Darvaja Office', 'Prem Darvaja, Ahmedabad', true)
ON CONFLICT (name) DO NOTHING
RETURNING id, name, address, is_active, created_at;

-- Verify the office was created
SELECT 
    'Default office verification' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.offices 
            WHERE name = 'Prem Darvaja Office'
        ) THEN '✓ PASS - Default office exists'
        ELSE '✗ FAIL - Default office not found'
    END as status;

-- Display all offices
SELECT 
    id,
    name,
    address,
    is_active,
    created_at,
    updated_at
FROM public.offices
ORDER BY created_at;
