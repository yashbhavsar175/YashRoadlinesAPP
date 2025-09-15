-- Quick test to check if screen_access column exists in user_profiles table
-- Run this first to diagnose the issue

-- Check if the user_profiles table exists and what columns it has
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- If the above query shows screen_access column missing, run this to add it:
-- ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS screen_access TEXT[] DEFAULT ARRAY[]::TEXT[];