-- Migration 021: Create function to insert login requests
-- This function runs with SECURITY DEFINER to bypass RLS issues

-- ============================================================================
-- 1. CREATE FUNCTION TO INSERT LOGIN REQUEST
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_login_request(
    p_user_id UUID,
    p_user_email VARCHAR(255),
    p_user_name VARCHAR(255)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Set expiration time to 10 minutes from now
    v_expires_at := NOW() + INTERVAL '10 minutes';
    
    -- Insert the login request
    INSERT INTO public.login_requests (
        user_id,
        user_email,
        user_name,
        status,
        expires_at,
        created_at
    ) VALUES (
        p_user_id,
        p_user_email,
        p_user_name,
        'pending',
        v_expires_at,
        NOW()
    )
    RETURNING id INTO v_request_id;
    
    RETURN v_request_id;
END;
$$;

-- ============================================================================
-- 2. GRANT EXECUTE PERMISSION
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_login_request(UUID, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_login_request(UUID, VARCHAR, VARCHAR) TO anon;

-- ============================================================================
-- 3. ADD COMMENT
-- ============================================================================

COMMENT ON FUNCTION public.create_login_request IS 'Creates a login request for admin approval. Runs with elevated privileges to bypass RLS.';
