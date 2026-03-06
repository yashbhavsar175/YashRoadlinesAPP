-- Migration 022: Make otp_code column nullable
-- The OTP code is set by admin during approval, so it should be nullable initially

-- Remove NOT NULL constraint from otp_code
ALTER TABLE public.login_requests 
ALTER COLUMN otp_code DROP NOT NULL;

-- Verify the change
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'login_requests'
AND column_name = 'otp_code';
