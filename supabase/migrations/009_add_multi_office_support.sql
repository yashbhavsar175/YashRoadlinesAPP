-- Migration: Add Multi-Office Support
-- This migration adds support for multiple office locations with complete data segregation

-- ============================================================================
-- 1. CREATE OFFICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.offices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for offices table
CREATE INDEX IF NOT EXISTS idx_offices_name ON public.offices(name);
CREATE INDEX IF NOT EXISTS idx_offices_is_active ON public.offices(is_active);
CREATE INDEX IF NOT EXISTS idx_offices_created_by ON public.offices(created_by);

-- Add comment to table
COMMENT ON TABLE public.offices IS 'Stores office locations for multi-office support';

-- ============================================================================
-- 2. ADD OFFICE_ID TO USER_PROFILES TABLE
-- ============================================================================

-- Add office_id column to user_profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'office_id'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN office_id UUID REFERENCES public.offices(id);
    END IF;
END $$;

-- Create index for user_profiles.office_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_office_id ON public.user_profiles(office_id);

-- ============================================================================
-- 3. ADD OFFICE_ID TO TRANSACTION TABLES
-- ============================================================================

-- Add office_id to agency_payments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_payments' 
        AND column_name = 'office_id'
    ) THEN
        ALTER TABLE public.agency_payments 
        ADD COLUMN office_id UUID REFERENCES public.offices(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agency_payments_office_id ON public.agency_payments(office_id);

-- Add office_id to agency_majuri
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_majuri' 
        AND column_name = 'office_id'
    ) THEN
        ALTER TABLE public.agency_majuri 
        ADD COLUMN office_id UUID REFERENCES public.offices(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agency_majuri_office_id ON public.agency_majuri(office_id);

-- Add office_id to driver_transactions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'driver_transactions' 
        AND column_name = 'office_id'
    ) THEN
        ALTER TABLE public.driver_transactions 
        ADD COLUMN office_id UUID REFERENCES public.offices(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_driver_transactions_office_id ON public.driver_transactions(office_id);

-- Add office_id to truck_fuel_entries
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'truck_fuel_entries' 
        AND column_name = 'office_id'
    ) THEN
        ALTER TABLE public.truck_fuel_entries 
        ADD COLUMN office_id UUID REFERENCES public.offices(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_truck_fuel_entries_office_id ON public.truck_fuel_entries(office_id);

-- Add office_id to general_entries
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'general_entries' 
        AND column_name = 'office_id'
    ) THEN
        ALTER TABLE public.general_entries 
        ADD COLUMN office_id UUID REFERENCES public.offices(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_general_entries_office_id ON public.general_entries(office_id);

-- Add office_id to agency_entries
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_entries' 
        AND column_name = 'office_id'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD COLUMN office_id UUID REFERENCES public.offices(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agency_entries_office_id ON public.agency_entries(office_id);

-- Add office_id to uppad_jama_entries
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'uppad_jama_entries' 
        AND column_name = 'office_id'
    ) THEN
        ALTER TABLE public.uppad_jama_entries 
        ADD COLUMN office_id UUID REFERENCES public.offices(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_uppad_jama_entries_office_id ON public.uppad_jama_entries(office_id);

-- Add office_id to cash_records
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cash_records' 
        AND column_name = 'office_id'
    ) THEN
        ALTER TABLE public.cash_records 
        ADD COLUMN office_id UUID REFERENCES public.offices(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cash_records_office_id ON public.cash_records(office_id);

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY FOR OFFICES TABLE
-- ============================================================================

ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all active offices
CREATE POLICY "Users can read active offices" ON public.offices
    FOR SELECT
    USING (is_active = true);

-- Policy: Only admins can insert offices
CREATE POLICY "Admins can insert offices" ON public.offices
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Policy: Only admins can update offices
CREATE POLICY "Admins can update offices" ON public.offices
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Policy: Only admins can delete offices
CREATE POLICY "Admins can delete offices" ON public.offices
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.offices TO postgres;
GRANT SELECT ON public.offices TO anon;
GRANT ALL ON public.offices TO authenticated;

-- ============================================================================
-- 6. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for offices table
DROP TRIGGER IF EXISTS update_offices_updated_at ON public.offices;
CREATE TRIGGER update_offices_updated_at
    BEFORE UPDATE ON public.offices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.offices.id IS 'Unique identifier for the office';
COMMENT ON COLUMN public.offices.name IS 'Office name (must be unique)';
COMMENT ON COLUMN public.offices.address IS 'Physical address of the office';
COMMENT ON COLUMN public.offices.is_active IS 'Whether the office is currently active';
COMMENT ON COLUMN public.offices.created_by IS 'User who created this office';
COMMENT ON COLUMN public.offices.created_at IS 'Timestamp when office was created';
COMMENT ON COLUMN public.offices.updated_at IS 'Timestamp when office was last updated';

COMMENT ON COLUMN public.user_profiles.office_id IS 'Office assignment for the user';
COMMENT ON COLUMN public.agency_payments.office_id IS 'Office where this payment was recorded';
COMMENT ON COLUMN public.agency_majuri.office_id IS 'Office where this majuri entry was recorded';
COMMENT ON COLUMN public.driver_transactions.office_id IS 'Office where this transaction was recorded';
COMMENT ON COLUMN public.truck_fuel_entries.office_id IS 'Office where this fuel entry was recorded';
COMMENT ON COLUMN public.general_entries.office_id IS 'Office where this entry was recorded';
COMMENT ON COLUMN public.agency_entries.office_id IS 'Office where this entry was recorded';
COMMENT ON COLUMN public.uppad_jama_entries.office_id IS 'Office where this entry was recorded';
COMMENT ON COLUMN public.cash_records.office_id IS 'Office where this cash record was recorded';
