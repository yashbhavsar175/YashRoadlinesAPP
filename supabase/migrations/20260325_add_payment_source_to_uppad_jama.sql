-- Add payment_source column to uppad_jama_entries table
-- This allows tracking whether payment came from business cash or personal wallet
-- Personal wallet payments should not appear in daily reports

ALTER TABLE uppad_jama_entries 
ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'business_cash' CHECK (payment_source IN ('business_cash', 'personal_wallet'));

-- Add comment to explain the column
COMMENT ON COLUMN uppad_jama_entries.payment_source IS 'Source of payment: business_cash (shows in daily report) or personal_wallet (does not show in daily report)';

-- Update existing entries to have business_cash as default
UPDATE uppad_jama_entries 
SET payment_source = 'business_cash' 
WHERE payment_source IS NULL;
