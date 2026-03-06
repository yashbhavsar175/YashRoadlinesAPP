-- Migration 024: Force fix all foreign key constraints on login_requests
-- This will drop ALL foreign key constraints and recreate them correctly

-- ============================================================================
-- 1. DROP ALL FOREIGN KEY CONSTRAINTS ON login_requests
-- ============================================================================

DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    -- Loop through all foreign key constraints on login_requests table
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.login_requests'::regclass 
        AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE public.login_requests DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- ============================================================================
-- 2. ADD CORRECT FOREIGN KEY CONSTRAINTS TO auth.users
-- ============================================================================

-- Add user_id foreign key to auth.users
ALTER TABLE public.login_requests 
ADD CONSTRAINT login_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add approved_by foreign key to auth.users (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'login_requests' 
        AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE public.login_requests 
        ADD CONSTRAINT login_requests_approved_by_fkey 
        FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 3. VERIFY THE CHANGES
-- ============================================================================

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.login_requests'::regclass
AND contype = 'f';
