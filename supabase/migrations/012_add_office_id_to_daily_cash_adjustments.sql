-- Migration: Add office_id to daily_cash_adjustments table
-- This migration adds office support to the daily_cash_adjustments table

-- ============================================================================
-- 1. ADD OFFICE_ID TO DAILY_CASH_ADJUSTMENTS TABLE
-- ============================================================================

-- Add office_id column to daily_cash_adjustments if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_cash_adjustments' 
        AND column_name = 'office_id'
    ) THEN
        ALTER TABLE public.daily_cash_adjustments 
        ADD COLUMN office_id UUID REFERENCES public.offices(id);
    END IF;
END $$;

-- Create index for daily_cash_adjustments.office_id
CREATE INDEX IF NOT EXISTS idx_daily_cash_adjustments_office_id ON public.daily_cash_adjustments(office_id);

-- ============================================================================
-- 2. UPDATE UNIQUE CONSTRAINT
-- ============================================================================

-- Drop the old unique constraint on date_key only
ALTER TABLE public.daily_cash_adjustments 
DROP CONSTRAINT IF EXISTS daily_cash_adjustments_date_key_key;

-- Add new unique constraint on (date_key, office_id)
ALTER TABLE public.daily_cash_adjustments 
ADD CONSTRAINT daily_cash_adjustments_date_key_office_id_key 
UNIQUE (date_key, office_id);

-- ============================================================================
-- 3. MIGRATE EXISTING DATA TO DEFAULT OFFICE
-- ============================================================================

-- Update all existing records to use the default office
UPDATE public.daily_cash_adjustments
SET office_id = (SELECT id FROM public.offices WHERE name = 'Prem Darvaja Office' LIMIT 1)
WHERE office_id IS NULL;

-- ============================================================================
-- 4. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.daily_cash_adjustments.office_id IS 'Office where this cash adjustment was recorded';

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

-- Verify the migration
DO $$
DECLARE
    column_exists BOOLEAN;
    index_exists BOOLEAN;
    constraint_exists BOOLEAN;
BEGIN
    -- Check if office_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_cash_adjustments' 
        AND column_name = 'office_id'
    ) INTO column_exists;
    
    -- Check if index exists
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'daily_cash_adjustments' 
        AND indexname = 'idx_daily_cash_adjustments_office_id'
    ) INTO index_exists;
    
    -- Check if unique constraint exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_cash_adjustments' 
        AND constraint_name = 'daily_cash_adjustments_date_key_office_id_key'
    ) INTO constraint_exists;
    
    IF column_exists AND index_exists AND constraint_exists THEN
        RAISE NOTICE '✅ Migration 012 completed successfully!';
        RAISE NOTICE '   - office_id column added';
        RAISE NOTICE '   - Index created';
        RAISE NOTICE '   - Unique constraint updated';
    ELSE
        RAISE WARNING '⚠️ Migration 012 may be incomplete:';
        RAISE WARNING '   - Column exists: %', column_exists;
        RAISE WARNING '   - Index exists: %', index_exists;
        RAISE WARNING '   - Constraint exists: %', constraint_exists;
    END IF;
END $$;
