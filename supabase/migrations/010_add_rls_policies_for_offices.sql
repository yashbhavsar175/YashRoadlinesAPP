-- Migration 010: Add Row Level Security (RLS) Policies for Multi-Office Support
-- This migration creates RLS policies for all transaction tables to ensure:
-- 1. Users can only see transactions from their assigned office
-- 2. Admins can see all transactions from all offices

-- Enable RLS on all transaction tables
ALTER TABLE agency_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_majuri ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_fuel_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE uppad_jama_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_records ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- AGENCY PAYMENTS RLS POLICIES
-- ============================================================================

-- Policy: Users can only SELECT transactions from their assigned office
CREATE POLICY "Users can view agency_payments from their office"
ON agency_payments
FOR SELECT
USING (
  -- Admin users can see all transactions
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  -- Regular users can only see transactions from their assigned office
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can only INSERT transactions for their assigned office
CREATE POLICY "Users can insert agency_payments for their office"
ON agency_payments
FOR INSERT
WITH CHECK (
  -- Admin users can insert for any office
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  -- Regular users can only insert for their assigned office
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can only UPDATE transactions from their assigned office
CREATE POLICY "Users can update agency_payments from their office"
ON agency_payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Policy: Users can only DELETE transactions from their assigned office
CREATE POLICY "Users can delete agency_payments from their office"
ON agency_payments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- AGENCY MAJURI RLS POLICIES
-- ============================================================================

CREATE POLICY "Users can view agency_majuri from their office"
ON agency_majuri
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert agency_majuri for their office"
ON agency_majuri
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update agency_majuri from their office"
ON agency_majuri
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete agency_majuri from their office"
ON agency_majuri
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- DRIVER TRANSACTIONS RLS POLICIES
-- ============================================================================

CREATE POLICY "Users can view driver_transactions from their office"
ON driver_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert driver_transactions for their office"
ON driver_transactions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update driver_transactions from their office"
ON driver_transactions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete driver_transactions from their office"
ON driver_transactions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- TRUCK FUEL ENTRIES RLS POLICIES
-- ============================================================================

CREATE POLICY "Users can view truck_fuel_entries from their office"
ON truck_fuel_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert truck_fuel_entries for their office"
ON truck_fuel_entries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update truck_fuel_entries from their office"
ON truck_fuel_entries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete truck_fuel_entries from their office"
ON truck_fuel_entries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- GENERAL ENTRIES RLS POLICIES
-- ============================================================================

CREATE POLICY "Users can view general_entries from their office"
ON general_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert general_entries for their office"
ON general_entries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update general_entries from their office"
ON general_entries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete general_entries from their office"
ON general_entries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- AGENCY ENTRIES RLS POLICIES
-- ============================================================================

CREATE POLICY "Users can view agency_entries from their office"
ON agency_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert agency_entries for their office"
ON agency_entries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update agency_entries from their office"
ON agency_entries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete agency_entries from their office"
ON agency_entries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- UPPAD JAMA ENTRIES RLS POLICIES
-- ============================================================================

CREATE POLICY "Users can view uppad_jama_entries from their office"
ON uppad_jama_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert uppad_jama_entries for their office"
ON uppad_jama_entries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update uppad_jama_entries from their office"
ON uppad_jama_entries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete uppad_jama_entries from their office"
ON uppad_jama_entries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- CASH RECORDS RLS POLICIES
-- ============================================================================

CREATE POLICY "Users can view cash_records from their office"
ON cash_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert cash_records for their office"
ON cash_records
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update cash_records from their office"
ON cash_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete cash_records from their office"
ON cash_records
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
  OR
  office_id IN (
    SELECT office_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled on all tables
DO $$
BEGIN
  RAISE NOTICE 'Verifying RLS is enabled on all transaction tables...';
END $$;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN (
  'agency_payments',
  'agency_majuri',
  'driver_transactions',
  'truck_fuel_entries',
  'general_entries',
  'agency_entries',
  'uppad_jama_entries',
  'cash_records'
)
ORDER BY tablename;

-- Count policies created
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'agency_payments',
  'agency_majuri',
  'driver_transactions',
  'truck_fuel_entries',
  'general_entries',
  'agency_entries',
  'uppad_jama_entries',
  'cash_records'
)
GROUP BY schemaname, tablename
ORDER BY tablename;
