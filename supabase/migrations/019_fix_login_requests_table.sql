-- Migration 019: Fix login_requests table - Rename columns and add missing ones
-- This migration aligns the existing table with the expected schema

-- ============================================================================
-- 1. RENAME EXISTING COLUMNS TO MATCH CODE EXPECTATIONS
-- ============================================================================

-- Rename 'username' to 'user_name'
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'login_requests' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE public.login_requests 
        RENAME COLUMN username TO user_name;
    END IF;
END $$;

-- Rename 'otp' to 'otp_code'
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'login_requests' 
        AND column_name = 'otp'
    ) THEN
        ALTER TABLE public.login_requests 
        RENAME COLUMN otp TO otp_code;
    END IF;
END $$;

-- ============================================================================
-- 2. ADD MISSING user_email COLUMN
-- ============================================================================

-- First, add the column as nullable
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'login_requests' 
        AND column_name = 'user_email'
    ) THEN
        ALTER TABLE public.login_requests 
        ADD COLUMN user_email VARCHAR(255);
        
        -- Populate user_email from auth.users table for existing records
        UPDATE public.login_requests lr
        SET user_email = u.email
        FROM auth.users u
        WHERE lr.user_id = u.id
        AND lr.user_email IS NULL;
        
        -- Set a default for any remaining null values
        UPDATE public.login_requests
        SET user_email = 'unknown@example.com'
        WHERE user_email IS NULL;
        
        -- Now make it NOT NULL
        ALTER TABLE public.login_requests 
        ALTER COLUMN user_email SET NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- 3. DROP request_type COLUMN IF IT EXISTS (not used in current code)
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'login_requests' 
        AND column_name = 'request_type'
    ) THEN
        ALTER TABLE public.login_requests 
        DROP COLUMN request_type;
    END IF;
END $$;

-- ============================================================================
-- 4. ADD updated_at COLUMN IF MISSING
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'login_requests' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.login_requests 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- ============================================================================
-- 5. VERIFY THE CHANGES
-- ============================================================================

SELECT 
    column_name, 
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'login_requests'
ORDER BY ordinal_position;
