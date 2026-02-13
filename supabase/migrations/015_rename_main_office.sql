-- Migration: Rename Main Office to Prem Darwaja(Main Office)
-- Update office name as per requirement

-- Update Main Office to Prem Darwaja(Main Office)
UPDATE public.offices 
SET name = 'Prem Darwaja(Main Office)',
    updated_at = NOW()
WHERE name = 'Main Office';

-- Verify the changes
SELECT id, name, address, is_active, created_at, updated_at 
FROM public.offices 
ORDER BY created_at;
