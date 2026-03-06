-- Verify the create_login_request function exists
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'create_login_request';

-- Test the function (replace with actual values)
-- SELECT public.create_login_request(
--     'f4ed122a-14c5-422f-8fcb-dc2d4a95cd01'::UUID,
--     'test@example.com',
--     'Test User'
-- );
