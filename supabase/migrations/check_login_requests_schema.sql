-- Check current schema of login_requests table
SELECT 
    column_name, 
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'login_requests'
ORDER BY ordinal_position;
