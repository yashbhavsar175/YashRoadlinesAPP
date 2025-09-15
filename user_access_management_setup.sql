-- User Access Management Database Setup
-- Run this in Supabase SQL Editor to add screen access functionality

-- =====================================================
-- 1. ADD SCREEN_ACCESS COLUMN TO USER_PROFILES
-- =====================================================

-- Check if screen_access column exists, if not add it
DO $$
BEGIN
  -- Check if the column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'screen_access'
  ) THEN
    -- Add the column
    ALTER TABLE public.user_profiles ADD COLUMN screen_access TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE 'Added screen_access column to user_profiles table';
  ELSE
    RAISE NOTICE 'screen_access column already exists in user_profiles table';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding screen_access column: %', SQLERRM;
END
$$;

-- =====================================================
-- 2. SET DEFAULT VALUES FOR EXISTING USERS
-- =====================================================

-- Update existing users to have empty screen_access array if null
UPDATE public.user_profiles 
SET screen_access = ARRAY[]::TEXT[] 
WHERE screen_access IS NULL;

-- =====================================================
-- 3. CREATE INDEX FOR BETTER PERFORMANCE
-- =====================================================

-- Create index on screen_access column for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_screen_access 
ON public.user_profiles USING GIN (screen_access);

-- =====================================================
-- 4. CREATE HELPER FUNCTIONS FOR SCREEN ACCESS
-- =====================================================

-- Function to check if user has access to a specific screen
CREATE OR REPLACE FUNCTION user_has_screen_access(user_id UUID, screen_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = user_id 
    AND (
      screen_name = ANY(screen_access) 
      OR is_admin = true  -- Admins have access to everything
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add screen access to user
CREATE OR REPLACE FUNCTION add_user_screen_access(user_id UUID, screen_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_profiles 
  SET screen_access = array_append(screen_access, screen_name),
      updated_at = NOW()
  WHERE id = user_id 
  AND NOT (screen_name = ANY(screen_access));
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove screen access from user
CREATE OR REPLACE FUNCTION remove_user_screen_access(user_id UUID, screen_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_profiles 
  SET screen_access = array_remove(screen_access, screen_name),
      updated_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: check admin status without triggering RLS (use SECURITY DEFINER)
CREATE OR REPLACE FUNCTION is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  admin_flag BOOLEAN := FALSE;
BEGIN
  SELECT is_admin INTO admin_flag FROM public.user_profiles WHERE id = user_id;
  RETURN COALESCE(admin_flag, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE RLS POLICIES FOR SCREEN ACCESS
-- =====================================================

-- Enable RLS on user_profiles if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage user screen access" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own screen access" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin full access to user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;

-- Policy 1: Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
CREATE POLICY "Admins can read all profiles" ON public.user_profiles
  FOR SELECT USING (
    is_user_admin(auth.uid()::uuid)
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
CREATE POLICY "Admins can update all profiles" ON public.user_profiles
  FOR UPDATE USING (
    is_user_admin(auth.uid()::uuid)
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
-- New policy: allow users to update their own row, but ensure they cannot change
-- the `is_admin` flag or their `screen_access` array. We use WITH CHECK to
-- compare the NEW values against the existing values in the table for the
-- calling user (auth.uid()). This avoids referencing OLD/NEW directly.
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Ensure the user cannot change their admin status
    AND is_admin = (
      SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()
    )
    -- Ensure the user cannot change their screen_access array
    AND screen_access = (
      SELECT screen_access FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can insert user profiles" ON public.user_profiles;
CREATE POLICY "Admins can insert user profiles" ON public.user_profiles
  FOR INSERT WITH CHECK (
    is_user_admin(auth.uid()::uuid)
  );

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Check if column was added successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles' 
  AND column_name = 'screen_access';

-- Check current user_profiles structure
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN screen_access IS NOT NULL THEN 1 END) as users_with_screen_access,
  COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users
FROM public.user_profiles;

-- List all current RLS policies on user_profiles
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
WHERE tablename = 'user_profiles';

-- =====================================================
-- 7. ALTERNATIVE: SIMPLER RLS APPROACH (if above fails)
-- =====================================================

-- If the above policies cause issues, you can use this simpler approach:
-- 
-- -- Disable RLS temporarily for testing
-- -- ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
-- 
-- -- Or create a very permissive policy for admins
-- -- CREATE POLICY "Admin bypass RLS" ON public.user_profiles
-- --   FOR ALL USING (
-- --     EXISTS (
-- --       SELECT 1 FROM auth.users 
-- --       WHERE auth.users.id = auth.uid() 
-- --       AND auth.users.email = 'yashbhavsar175@gmail.com'
-- --     )
-- --   );

-- =====================================================
-- 8. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT EXECUTE ON FUNCTION user_has_screen_access TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_screen_access TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_screen_access TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_admin TO authenticated;

-- =====================================================
-- 9. COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'User Access Management database setup completed successfully!';
END
$$;