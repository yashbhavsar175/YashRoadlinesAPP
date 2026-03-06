-- Migration: Add payment_type column to agency_entries table
-- Purpose: Track payment method for Mumbai delivery confirmations
-- Date: 2026-03-06

-- Add payment_type column to agency_entries
ALTER TABLE public.agency_entries 
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('cash', 'gpay_sapan', 'gpay_yash'));

-- Add comment
COMMENT ON COLUMN public.agency_entries.payment_type IS 'Payment method: cash, gpay_sapan (Sapan GPay), or gpay_yash (Yash Roadlines GPay)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_agency_entries_payment_type ON public.agency_entries(payment_type);
