-- Migration: Add metadata column to general_entries table
-- Purpose: Store additional information for Mumbai delivery entries (consignee, item description)
-- Date: 2026-03-06

-- Add metadata column to general_entries
ALTER TABLE public.general_entries 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add comment
COMMENT ON COLUMN public.general_entries.metadata IS 'JSON metadata for storing additional entry information (e.g., consignee_name, item_description for Mumbai deliveries)';

-- Create index for better query performance on metadata
CREATE INDEX IF NOT EXISTS idx_general_entries_metadata ON public.general_entries USING GIN (metadata);
