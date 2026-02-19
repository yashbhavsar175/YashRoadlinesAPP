-- Migration 018: Create separate Mumbai Deliveries table
-- This creates a dedicated table for new Mumbai delivery workflow
-- Old data in agency_entries will remain separate

-- ============================================================================
-- 1. CREATE MUMBAI_DELIVERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mumbai_deliveries (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Delivery Information (from New Delivery form)
    billty_no TEXT NOT NULL,
    consignee_name TEXT NOT NULL,
    item_description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Confirmation Status
    confirmation_status TEXT DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed')),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_amount NUMERIC(10, 2),
    
    -- Photo References
    bilty_photo_id UUID,
    signature_photo_id UUID,
    
    -- Additional Flags
    taken_from_godown BOOLEAN DEFAULT FALSE,
    payment_received BOOLEAN DEFAULT FALSE,
    
    -- Office and User Tracking
    office_id UUID REFERENCES public.offices(id),
    created_by UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE public.mumbai_deliveries IS 'Dedicated table for Mumbai delivery records with two-screen workflow';

COMMENT ON COLUMN public.mumbai_deliveries.id IS 'Unique identifier for the delivery record';
COMMENT ON COLUMN public.mumbai_deliveries.billty_no IS 'Billty/Bilty number for the delivery';
COMMENT ON COLUMN public.mumbai_deliveries.consignee_name IS 'Name of the consignee receiving the delivery';
COMMENT ON COLUMN public.mumbai_deliveries.item_description IS 'Description of items being delivered';
COMMENT ON COLUMN public.mumbai_deliveries.amount IS 'Delivery amount';
COMMENT ON COLUMN public.mumbai_deliveries.entry_date IS 'Date of delivery entry';
COMMENT ON COLUMN public.mumbai_deliveries.confirmation_status IS 'Payment confirmation status: pending or confirmed';
COMMENT ON COLUMN public.mumbai_deliveries.confirmed_at IS 'Timestamp when payment was confirmed';
COMMENT ON COLUMN public.mumbai_deliveries.confirmed_amount IS 'Amount confirmed during payment confirmation';
COMMENT ON COLUMN public.mumbai_deliveries.bilty_photo_id IS 'Reference to bilty photo';
COMMENT ON COLUMN public.mumbai_deliveries.signature_photo_id IS 'Reference to signature photo';
COMMENT ON COLUMN public.mumbai_deliveries.taken_from_godown IS 'Whether item has been taken from godown';
COMMENT ON COLUMN public.mumbai_deliveries.payment_received IS 'Whether payment has been received';
COMMENT ON COLUMN public.mumbai_deliveries.office_id IS 'Office where this delivery was created';
COMMENT ON COLUMN public.mumbai_deliveries.created_by IS 'User who created this delivery record';
COMMENT ON COLUMN public.mumbai_deliveries.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN public.mumbai_deliveries.updated_at IS 'Timestamp when record was last updated';

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mumbai_deliveries_billty_no ON public.mumbai_deliveries(billty_no);
CREATE INDEX IF NOT EXISTS idx_mumbai_deliveries_confirmation_status ON public.mumbai_deliveries(confirmation_status);
CREATE INDEX IF NOT EXISTS idx_mumbai_deliveries_office_id ON public.mumbai_deliveries(office_id);
CREATE INDEX IF NOT EXISTS idx_mumbai_deliveries_entry_date ON public.mumbai_deliveries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_mumbai_deliveries_created_by ON public.mumbai_deliveries(created_by);

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.mumbai_deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read deliveries from their office
CREATE POLICY "Users can read deliveries from their office" ON public.mumbai_deliveries
    FOR SELECT
    USING (
        office_id IN (
            SELECT office_id FROM public.user_profiles
            WHERE id = auth.uid()
        )
        OR office_id IS NULL
    );

-- Policy: Users can insert deliveries for their office
CREATE POLICY "Users can insert deliveries for their office" ON public.mumbai_deliveries
    FOR INSERT
    WITH CHECK (
        office_id IN (
            SELECT office_id FROM public.user_profiles
            WHERE id = auth.uid()
        )
        OR office_id IS NULL
    );

-- Policy: Users can update deliveries from their office
CREATE POLICY "Users can update deliveries from their office" ON public.mumbai_deliveries
    FOR UPDATE
    USING (
        office_id IN (
            SELECT office_id FROM public.user_profiles
            WHERE id = auth.uid()
        )
        OR office_id IS NULL
    );

-- Policy: Users can delete deliveries from their office
CREATE POLICY "Users can delete deliveries from their office" ON public.mumbai_deliveries
    FOR DELETE
    USING (
        office_id IN (
            SELECT office_id FROM public.user_profiles
            WHERE id = auth.uid()
        )
        OR office_id IS NULL
    );

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.mumbai_deliveries TO postgres;
GRANT SELECT ON public.mumbai_deliveries TO anon;
GRANT ALL ON public.mumbai_deliveries TO authenticated;

-- ============================================================================
-- 6. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS update_mumbai_deliveries_updated_at ON public.mumbai_deliveries;
CREATE TRIGGER update_mumbai_deliveries_updated_at
    BEFORE UPDATE ON public.mumbai_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. UPDATE DELIVERY_PHOTOS TABLE TO REFERENCE MUMBAI_DELIVERIES
-- ============================================================================

-- Add new column for mumbai_deliveries reference
ALTER TABLE public.delivery_photos 
ADD COLUMN IF NOT EXISTS mumbai_delivery_id UUID REFERENCES public.mumbai_deliveries(id) ON DELETE CASCADE;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_delivery_photos_mumbai_delivery_id ON public.delivery_photos(mumbai_delivery_id);

-- Add comment
COMMENT ON COLUMN public.delivery_photos.mumbai_delivery_id IS 'Reference to Mumbai delivery record (new table)';

-- ============================================================================
-- 8. VERIFICATION QUERY
-- ============================================================================

-- Verify table was created with all columns
SELECT 
    column_name, 
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'mumbai_deliveries'
ORDER BY ordinal_position;
