-- Migration: Mumbai Delivery Redesign
-- This migration extends the agency_entries table and creates a new delivery_photos table
-- to support the two-screen delivery workflow with payment confirmation and photo proof

-- ============================================================================
-- 1. EXTEND AGENCY_ENTRIES TABLE WITH NEW COLUMNS
-- ============================================================================

-- Add billty_no column
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_entries' 
        AND column_name = 'billty_no'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD COLUMN billty_no TEXT;
    END IF;
END $;

-- Add consignee_name column
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_entries' 
        AND column_name = 'consignee_name'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD COLUMN consignee_name TEXT;
    END IF;
END $;

-- Add item_description column
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_entries' 
        AND column_name = 'item_description'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD COLUMN item_description TEXT;
    END IF;
END $;

-- Add confirmation_status column with check constraint
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_entries' 
        AND column_name = 'confirmation_status'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD COLUMN confirmation_status TEXT DEFAULT 'pending' 
        CHECK (confirmation_status IN ('pending', 'confirmed'));
    END IF;
END $;

-- Add confirmed_at column
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_entries' 
        AND column_name = 'confirmed_at'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $;

-- Add confirmed_amount column
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_entries' 
        AND column_name = 'confirmed_amount'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD COLUMN confirmed_amount NUMERIC(10, 2);
    END IF;
END $;

-- Add bilty_photo_id column (will be linked after delivery_photos table is created)
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_entries' 
        AND column_name = 'bilty_photo_id'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD COLUMN bilty_photo_id UUID;
    END IF;
END $;

-- Add signature_photo_id column (will be linked after delivery_photos table is created)
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_entries' 
        AND column_name = 'signature_photo_id'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD COLUMN signature_photo_id UUID;
    END IF;
END $;

-- Add taken_from_godown column
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_entries' 
        AND column_name = 'taken_from_godown'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD COLUMN taken_from_godown BOOLEAN DEFAULT FALSE;
    END IF;
END $;

-- Add payment_received column
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agency_entries' 
        AND column_name = 'payment_received'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD COLUMN payment_received BOOLEAN DEFAULT FALSE;
    END IF;
END $;

-- ============================================================================
-- 2. CREATE DELIVERY_PHOTOS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_record_id UUID NOT NULL REFERENCES public.agency_entries(id) ON DELETE CASCADE,
    photo_type TEXT NOT NULL CHECK (photo_type IN ('bilty', 'signature')),
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded BOOLEAN DEFAULT FALSE,
    upload_url TEXT,
    office_id UUID REFERENCES public.offices(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE public.delivery_photos IS 'Stores photo records for delivery proof (bilty and signature)';

-- Add comments for columns
COMMENT ON COLUMN public.delivery_photos.id IS 'Unique identifier for the photo record';
COMMENT ON COLUMN public.delivery_photos.delivery_record_id IS 'Reference to the delivery record in agency_entries';
COMMENT ON COLUMN public.delivery_photos.photo_type IS 'Type of photo: bilty or signature';
COMMENT ON COLUMN public.delivery_photos.file_path IS 'Local file path or remote URL';
COMMENT ON COLUMN public.delivery_photos.file_name IS 'Original filename';
COMMENT ON COLUMN public.delivery_photos.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.delivery_photos.mime_type IS 'MIME type of the photo (e.g., image/jpeg)';
COMMENT ON COLUMN public.delivery_photos.uploaded IS 'Whether the photo has been uploaded to remote storage';
COMMENT ON COLUMN public.delivery_photos.upload_url IS 'Remote storage URL after upload';
COMMENT ON COLUMN public.delivery_photos.office_id IS 'Office where this photo was captured';
COMMENT ON COLUMN public.delivery_photos.created_by IS 'User who captured this photo';
COMMENT ON COLUMN public.delivery_photos.created_at IS 'Timestamp when photo was captured';
COMMENT ON COLUMN public.delivery_photos.updated_at IS 'Timestamp when photo record was last updated';

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for agency_entries new columns
CREATE INDEX IF NOT EXISTS idx_agency_entries_billty_no ON public.agency_entries(billty_no);
CREATE INDEX IF NOT EXISTS idx_agency_entries_confirmation_status ON public.agency_entries(confirmation_status);

-- Indexes for delivery_photos table
CREATE INDEX IF NOT EXISTS idx_delivery_photos_record_id ON public.delivery_photos(delivery_record_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_office_id ON public.delivery_photos(office_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_photo_type ON public.delivery_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_uploaded ON public.delivery_photos(uploaded);

-- ============================================================================
-- 4. ADD FOREIGN KEY CONSTRAINTS FOR PHOTO REFERENCES
-- ============================================================================

-- Add foreign key constraint for bilty_photo_id
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_agency_entries_bilty_photo'
        AND table_name = 'agency_entries'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD CONSTRAINT fk_agency_entries_bilty_photo 
        FOREIGN KEY (bilty_photo_id) REFERENCES public.delivery_photos(id) ON DELETE SET NULL;
    END IF;
END $;

-- Add foreign key constraint for signature_photo_id
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_agency_entries_signature_photo'
        AND table_name = 'agency_entries'
    ) THEN
        ALTER TABLE public.agency_entries 
        ADD CONSTRAINT fk_agency_entries_signature_photo 
        FOREIGN KEY (signature_photo_id) REFERENCES public.delivery_photos(id) ON DELETE SET NULL;
    END IF;
END $;

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY FOR DELIVERY_PHOTOS TABLE
-- ============================================================================

ALTER TABLE public.delivery_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read photos from their office
CREATE POLICY "Users can read photos from their office" ON public.delivery_photos
    FOR SELECT
    USING (
        office_id IN (
            SELECT office_id FROM public.user_profiles
            WHERE id = auth.uid()
        )
        OR office_id IS NULL
    );

-- Policy: Users can insert photos for their office
CREATE POLICY "Users can insert photos for their office" ON public.delivery_photos
    FOR INSERT
    WITH CHECK (
        office_id IN (
            SELECT office_id FROM public.user_profiles
            WHERE id = auth.uid()
        )
        OR office_id IS NULL
    );

-- Policy: Users can update photos from their office
CREATE POLICY "Users can update photos from their office" ON public.delivery_photos
    FOR UPDATE
    USING (
        office_id IN (
            SELECT office_id FROM public.user_profiles
            WHERE id = auth.uid()
        )
        OR office_id IS NULL
    );

-- Policy: Users can delete photos from their office
CREATE POLICY "Users can delete photos from their office" ON public.delivery_photos
    FOR DELETE
    USING (
        office_id IN (
            SELECT office_id FROM public.user_profiles
            WHERE id = auth.uid()
        )
        OR office_id IS NULL
    );

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.delivery_photos TO postgres;
GRANT SELECT ON public.delivery_photos TO anon;
GRANT ALL ON public.delivery_photos TO authenticated;

-- ============================================================================
-- 7. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Create trigger for delivery_photos table
DROP TRIGGER IF EXISTS update_delivery_photos_updated_at ON public.delivery_photos;
CREATE TRIGGER update_delivery_photos_updated_at
    BEFORE UPDATE ON public.delivery_photos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. ADD COMMENTS FOR NEW AGENCY_ENTRIES COLUMNS
-- ============================================================================

COMMENT ON COLUMN public.agency_entries.billty_no IS 'Unique billty/bilty number for the delivery';
COMMENT ON COLUMN public.agency_entries.consignee_name IS 'Name of the consignee receiving the delivery';
COMMENT ON COLUMN public.agency_entries.item_description IS 'Description of items being delivered';
COMMENT ON COLUMN public.agency_entries.confirmation_status IS 'Payment confirmation status: pending or confirmed';
COMMENT ON COLUMN public.agency_entries.confirmed_at IS 'Timestamp when payment was confirmed';
COMMENT ON COLUMN public.agency_entries.confirmed_amount IS 'Amount confirmed during payment confirmation';
COMMENT ON COLUMN public.agency_entries.bilty_photo_id IS 'Reference to bilty photo in delivery_photos table';
COMMENT ON COLUMN public.agency_entries.signature_photo_id IS 'Reference to signature photo in delivery_photos table';
COMMENT ON COLUMN public.agency_entries.taken_from_godown IS 'Whether item has been taken from godown';
COMMENT ON COLUMN public.agency_entries.payment_received IS 'Whether payment has been received';
