-- Test the create_login_request function directly

-- First, verify the function exists
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'create_login_request';

-- Test creating a login request
SELECT public.create_login_request(
    'f4ed122a-14c5-422f-8fcb-dc2d4a95cd01'::UUID,
    'test@example.com',
    'Test User'
);

-- Check if it was created
SELECT * FROM public.login_requests 
WHERE user_id = 'f4ed122a-14c5-422f-8fcb-dc2d4a95cd01'
ORDER BY created_at DESC 
LIMIT 1;
