-- Debug Script: Check your database structure
-- Run these queries in Supabase SQL Editor to understand your current setup

-- 1. Check if user_profiles table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public';

-- 2. If user_profiles exists, check its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check sample data in user_profiles (if exists)
-- SELECT * FROM user_profiles LIMIT 5;

-- 4. Check if auth.users table is accessible
SELECT count(*) as auth_users_count FROM auth.users;

-- 5. Check current user's auth.uid()
SELECT auth.uid() as current_user_id;

-- 6. List all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Based on the results above, you'll know:
-- - If user_profiles table exists
-- - What columns it has (probably 'id' instead of 'user_id')
-- - What the correct column names are for the policies
