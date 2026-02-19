-- Quick Apply Migration 018
-- Creates separate mumbai_deliveries table for new Mumbai delivery workflow
-- Run this in Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS public.mumbai_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    billty_no TEXT NOT NULL,
    consignee_name TEXT NOT NULL,
    item_description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    confirmation_status TEXT DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed')),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_amount NUMERIC(10, 2),
    taken_from_godown BOOLEAN DEFAULT FALSE,
    payment_received BOOLEAN DEFAULT FALSE,
    office_id UUID REFERENCES public.offices(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mumbai_deliveries_billty_no ON public.mumbai_deliveries(billty_no);
CREATE INDEX IF NOT EXISTS idx_mumbai_deliveries_confirmation_status ON public.mumbai_deliveries(confirmation_status);
CREATE INDEX IF NOT EXISTS idx_mumbai_deliveries_office_id ON public.mumbai_deliveries(office_id);
CREATE INDEX IF NOT EXISTS idx_mumbai_deliveries_entry_date ON public.mumbai_deliveries(entry_date DESC);

-- Enable RLS
ALTER TABLE public.mumbai_deliveries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read deliveries from their office" ON public.mumbai_deliveries
    FOR SELECT USING (
        office_id IN (SELECT office_id FROM public.user_profiles WHERE id = auth.uid())
        OR office_id IS NULL
    );

CREATE POLICY "Users can insert deliveries for their office" ON public.mumbai_deliveries
    FOR INSERT WITH CHECK (
        office_id IN (SELECT office_id FROM public.user_profiles WHERE id = auth.uid())
        OR office_id IS NULL
    );

CREATE POLICY "Users can update deliveries from their office" ON public.mumbai_deliveries
    FOR UPDATE USING (
        office_id IN (SELECT office_id FROM public.user_profiles WHERE id = auth.uid())
        OR office_id IS NULL
    );

CREATE POLICY "Users can delete deliveries from their office" ON public.mumbai_deliveries
    FOR DELETE USING (
        office_id IN (SELECT office_id FROM public.user_profiles WHERE id = auth.uid())
        OR office_id IS NULL
    );

-- Grant permissions
GRANT ALL ON public.mumbai_deliveries TO postgres;
GRANT SELECT ON public.mumbai_deliveries TO anon;
GRANT ALL ON public.mumbai_deliveries TO authenticated;

-- Create trigger for updated_at
CREATE TRIGGER update_mumbai_deliveries_updated_at
    BEFORE UPDATE ON public.mumbai_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Verify table creation
SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'mumbai_deliveries'
ORDER BY ordinal_position;
