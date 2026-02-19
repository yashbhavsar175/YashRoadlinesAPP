-- Quick Apply Migration 017
-- Run this in Supabase SQL Editor to add Mumbai Delivery columns

-- Add billty_no column
ALTER TABLE public.agency_entries 
ADD COLUMN IF NOT EXISTS billty_no TEXT;

-- Add consignee_name column
ALTER TABLE public.agency_entries 
ADD COLUMN IF NOT EXISTS consignee_name TEXT;

-- Add item_description column
ALTER TABLE public.agency_entries 
ADD COLUMN IF NOT EXISTS item_description TEXT;

-- Add confirmation_status column
ALTER TABLE public.agency_entries 
ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'pending';

-- Add confirmed_at column
ALTER TABLE public.agency_entries 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Add confirmed_amount column
ALTER TABLE public.agency_entries 
ADD COLUMN IF NOT EXISTS confirmed_amount NUMERIC(10, 2);

-- Add bilty_photo_id column
ALTER TABLE public.agency_entries 
ADD COLUMN IF NOT EXISTS bilty_photo_id UUID;

-- Add signature_photo_id column
ALTER TABLE public.agency_entries 
ADD COLUMN IF NOT EXISTS signature_photo_id UUID;

-- Add taken_from_godown column
ALTER TABLE public.agency_entries 
ADD COLUMN IF NOT EXISTS taken_from_godown BOOLEAN DEFAULT FALSE;

-- Add payment_received column
ALTER TABLE public.agency_entries 
ADD COLUMN IF NOT EXISTS payment_received BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agency_entries_billty_no ON public.agency_entries(billty_no);
CREATE INDEX IF NOT EXISTS idx_agency_entries_confirmation_status ON public.agency_entries(confirmation_status);

-- Verify columns were added
SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'agency_entries' 
AND column_name IN (
    'billty_no', 
    'consignee_name', 
    'item_description', 
    'confirmation_status',
    'confirmed_at',
    'confirmed_amount',
    'bilty_photo_id',
    'signature_photo_id',
    'taken_from_godown',
    'payment_received'
)
ORDER BY column_name;
