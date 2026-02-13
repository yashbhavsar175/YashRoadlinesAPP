-- Migration: Admin OTP Approval System
-- This migration creates a system where admins approve logins and set OTP codes

-- ============================================================================
-- 1. CREATE LOGIN REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.login_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    otp_code VARCHAR(6),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_login_requests_user_id ON public.login_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_login_requests_status ON public.login_requests(status);
CREATE INDEX IF NOT EXISTS idx_login_requests_expires_at ON public.login_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_requests_created_at ON public.login_requests(created_at DESC);

-- Add comments
COMMENT ON TABLE public.login_requests IS 'Stores pending login requests that require admin approval';
COMMENT ON COLUMN public.login_requests.user_id IS 'User requesting login';
COMMENT ON COLUMN public.login_requests.status IS 'Request status: pending, approved, rejected, expired';
COMMENT ON COLUMN public.login_requests.otp_code IS 'OTP code set by admin';
COMMENT ON COLUMN public.login_requests.approved_by IS 'Admin who approved the request';
COMMENT ON COLUMN public.login_requests.expires_at IS 'When this request expires';

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.login_requests ENABLE ROW LEVEL SECURITY;

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
-- 3. CREATE FUNCTION TO AUTO-EXPIRE OLD REQUESTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expire_old_login_requests()
RETURNS void AS $$
BEGIN
    UPDATE public.login_requests
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS update_login_requests_updated_at ON public.login_requests;
CREATE TRIGGER update_login_requests_updated_at
    BEFORE UPDATE ON public.login_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.login_requests TO postgres;
GRANT SELECT, INSERT ON public.login_requests TO authenticated;
GRANT ALL ON public.login_requests TO service_role;

-- ============================================================================
-- 6. CREATE FUNCTION TO CLEAN UP OLD REQUESTS (Optional - for maintenance)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_login_requests()
RETURNS void AS $$
BEGIN
    -- Delete requests older than 24 hours
    DELETE FROM public.login_requests
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_login_requests IS 'Deletes login requests older than 24 hours';
