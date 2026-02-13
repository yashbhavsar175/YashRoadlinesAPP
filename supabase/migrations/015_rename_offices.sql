-- Migration: Rename Offices
-- Update office names as per requirement

-- Update Aslali to All Office
UPDATE public.offices 
SET name = 'All Office',
    updated_at = NOW()
WHERE name = 'Aslali';

-- Update Main Office to Prem Darawaja(Main Office)
UPDATE public.offices 
SET name = 'Prem Darawaja(Main Office)',
    updated_at = NOW()
WHERE name = 'Main Office';

-- Verify the changes
SELECT id, name, address, is_active, created_at, updated_at 
FROM public.offices 
ORDER BY created_at;
