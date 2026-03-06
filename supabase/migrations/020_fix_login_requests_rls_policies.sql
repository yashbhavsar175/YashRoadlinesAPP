-- Migration 020: Fix RLS Policies for login_requests table
-- This ensures users can insert their own login requests

-- ============================================================================
-- 1. DROP EXISTING POLICIES (if any)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own login requests" ON public.login_requests;
DROP POLICY IF EXISTS "Users can create login requests" ON public.login_requests;
DROP POLICY IF EXISTS "Admins can read all login requests" ON public.login_requests;
DROP POLICY IF EXISTS "Admins can update login requests" ON public.login_requests;

-- ============================================================================
-- 2. ENSURE RLS IS ENABLED
-- ============================================================================

ALTER TABLE public.login_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. CREATE CORRECT RLS POLICIES
-- ============================================================================

-- Policy: Users can read their own login requests
CREATE POLICY "Users can read own login requests" ON public.login_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own login requests
CREATE POLICY "Users can create login requests" ON public.login_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can read all login requests
CREATE POLICY "Admins can read all login requests" ON public.login_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Policy: Admins can update login requests
CREATE POLICY "Admins can update login requests" ON public.login_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.login_requests TO postgres;
GRANT SELECT, INSERT ON public.login_requests TO authenticated;
GRANT ALL ON public.login_requests TO service_role;

-- ============================================================================
-- 5. VERIFY POLICIES
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'login_requests';
