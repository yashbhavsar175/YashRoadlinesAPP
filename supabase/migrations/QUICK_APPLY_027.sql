-- Quick Apply Script for Migration 027
-- Purpose: Add metadata column to general_entries table
-- Instructions: Copy and paste this entire script into Supabase SQL Editor and run it

-- Step 1: Add metadata column to general_entries
ALTER TABLE public.general_entries 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Step 2: Add comment
COMMENT ON COLUMN public.general_entries.metadata IS 'JSON metadata for storing additional entry information (e.g., consignee_name, item_description for Mumbai deliveries)';

-- Step 3: Create index for better query performance on metadata
CREATE INDEX IF NOT EXISTS idx_general_entries_metadata ON public.general_entries USING GIN (metadata);

-- Step 4: Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'general_entries'
  AND column_name = 'metadata';

-- Expected output: One row showing metadata column with JSONB type

-- Step 5: Test inserting a record with metadata
DO $$
DECLARE
  test_id UUID;
BEGIN
  -- Insert test record
  INSERT INTO public.general_entries (description, amount, entry_type, entry_date, metadata)
  VALUES (
    'Test Mumbai Delivery - 1234',
    1000,
    'credit',
    NOW(),
    '{"consignee_name": "Test Consignee", "item_description": "Test Item", "billty_no": "1234"}'::JSONB
  )
  RETURNING id INTO test_id;
  
  RAISE NOTICE 'Test record inserted with ID: %', test_id;
  
  -- Delete test record
  DELETE FROM public.general_entries WHERE id = test_id;
  
  RAISE NOTICE 'Test record deleted successfully';
END $$;

-- Success message
SELECT 'Migration 027 applied successfully! The metadata column is now available in general_entries table.' AS status;
