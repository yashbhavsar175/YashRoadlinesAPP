-- Migration 030: User-scoped RLS policy for uppad_jama_entries
-- Allows normal users to SELECT and INSERT only their own rows (created_by = auth.uid()).
-- Admins retain full access via the existing office-scoped policies in migration 010.

-- ============================================================
-- NOTE: RLS is already ENABLED on uppad_jama_entries (migration 010).
-- The existing policies allow access by office_id match OR admin.
-- This migration adds an ADDITIONAL policy so that users can always
-- read/write their own rows regardless of office assignment.
-- ============================================================

-- Allow users to SELECT their own entries (created_by = current user)
CREATE POLICY "Users can select their own uppad_jama_entries"
ON uppad_jama_entries
FOR SELECT
USING (
  created_by = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- Allow users to INSERT entries where created_by = their own uid
CREATE POLICY "Users can insert their own uppad_jama_entries"
ON uppad_jama_entries
FOR INSERT
WITH CHECK (
  created_by = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- Allow users to DELETE only their own entries
CREATE POLICY "Users can delete their own uppad_jama_entries"
ON uppad_jama_entries
FOR DELETE
USING (
  created_by = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true
  )
);
