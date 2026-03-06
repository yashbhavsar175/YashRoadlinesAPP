`-- Migration 025: Clean up invalid data and fix foreign key constraints
-- This will remove invalid records before changing constraints

-- ============================================================================
-- 1. CHECK FOR INVALID RECORDS
-- ============================================================================

-- Show records with invalid user_id (not in auth.users)
SELECT 
    lr.id,
    lr.user_id,
    lr.user_email,
    lr.created_at
FROM public.login_requests lr
LEFT JOIN auth.users u ON lr.user_id = u.id
WHERE u.id IS NULL;

-- ============================================================================
-- 2. DELETE INVALID RECORDS
-- ============================================================================

-- Delete login_requests with user_id not in auth.users
DELETE FROM public.login_requests
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- ============================================================================
-- 3. DROP OLD CONSTRAINTS
-- ============================================================================

ALTER TABLE public.login_requests DROP CONSTRAINT IF EXISTS login_requests_user_id_fkey;
ALTER TABLE public.login_requests DROP CONSTRAINT IF EXISTS login_requests_approved_by_fkey;

-- ============================================================================
-- 4. ADD CORRECT CONSTRAINTS TO auth.users
-- ============================================================================

ALTER TABLE public.login_requests 
ADD CONSTRAINT login_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.login_requests 
ADD CONSTRAINT login_requests_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. VERIFY THE CHANGES
-- ============================================================================

SELECT 
    conname AS constraint_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.login_requests'::regclass
AND contype = 'f';
`