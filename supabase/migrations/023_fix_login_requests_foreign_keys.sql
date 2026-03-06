-- Migration 023: Fix foreign key constraints on login_requests table
-- Change references from public.users to auth.users

-- ============================================================================
-- 1. CHECK CURRENT CONSTRAINTS
-- ============================================================================

SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    a.attname AS column_name,
    af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid = 'public.login_requests'::regclass
AND contype = 'f';

-- ============================================================================
-- 2. DROP EXISTING FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Drop user_id foreign key if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'login_requests_user_id_fkey' 
        AND conrelid = 'public.login_requests'::regclass
    ) THEN
        ALTER TABLE public.login_requests 
        DROP CONSTRAINT login_requests_user_id_fkey;
    END IF;
END $$;

-- Drop approved_by foreign key if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'login_requests_approved_by_fkey' 
        AND conrelid = 'public.login_requests'::regclass
    ) THEN
        ALTER TABLE public.login_requests 
        DROP CONSTRAINT login_requests_approved_by_fkey;
    END IF;
END $$;

-- ============================================================================
-- 3. ADD CORRECT FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add user_id foreign key to auth.users
ALTER TABLE public.login_requests 
ADD CONSTRAINT login_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add approved_by foreign key to auth.users
ALTER TABLE public.login_requests 
ADD CONSTRAINT login_requests_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. VERIFY THE CHANGES
-- ============================================================================

SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    a.attname AS column_name,
    af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid = 'public.login_requests'::regclass
AND contype = 'f';
