-- Create majur_payments table for tracking payments made to majurs
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS majur_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    majur_id VARCHAR(255) NOT NULL,
    majur_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    recorded_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add screen_access column to user_profiles table (if not exists)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS screen_access TEXT[];

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_majur_payments_majur_id ON majur_payments(majur_id);
CREATE INDEX IF NOT EXISTS idx_majur_payments_payment_date ON majur_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_majur_payments_recorded_by ON majur_payments(recorded_by);
CREATE INDEX IF NOT EXISTS idx_majur_payments_created_at ON majur_payments(created_at);

-- Create updated_at trigger for majur_payments
CREATE OR REPLACE FUNCTION update_majur_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS majur_payments_updated_at_trigger ON majur_payments;
CREATE TRIGGER majur_payments_updated_at_trigger
    BEFORE UPDATE ON majur_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_majur_payments_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE majur_payments ENABLE ROW LEVEL SECURITY;

-- Policies for majur_payments table
DROP POLICY IF EXISTS "Admin can view all majur payments" ON majur_payments;
CREATE POLICY "Admin can view all majur payments" ON majur_payments
    FOR SELECT
    USING (
        is_user_admin(auth.uid()::uuid)
        OR 
        auth.email() = 'lbhavsar31@gmail.com'
    );

DROP POLICY IF EXISTS "Admin can insert majur payments" ON majur_payments;
CREATE POLICY "Admin can insert majur payments" ON majur_payments
    FOR INSERT
    WITH CHECK (
        is_user_admin(auth.uid()::uuid)
        OR 
        auth.email() = 'lbhavsar31@gmail.com'
    );

DROP POLICY IF EXISTS "Admin can update majur payments" ON majur_payments;
CREATE POLICY "Admin can update majur payments" ON majur_payments
    FOR UPDATE
    USING (
        is_user_admin(auth.uid()::uuid)
        OR 
        auth.email() = 'lbhavsar31@gmail.com'
    );

DROP POLICY IF EXISTS "Admin can delete majur payments" ON majur_payments;
CREATE POLICY "Admin can delete majur payments" ON majur_payments
    FOR DELETE
    USING (
        is_user_admin(auth.uid()::uuid)
        OR 
        auth.email() = 'lbhavsar31@gmail.com'
    );

-- Majurs can view their own payments
DROP POLICY IF EXISTS "Majur can view own payments" ON majur_payments;
CREATE POLICY "Majur can view own payments" ON majur_payments
    FOR SELECT
    USING (majur_id = auth.uid()::text);

-- Grant necessary permissions
GRANT ALL ON majur_payments TO authenticated;
GRANT ALL ON majur_payments TO service_role;

-- Grant execute permission on helper function (ensure this exists from user_access setup)
GRANT EXECUTE ON FUNCTION is_user_admin TO authenticated;

-- Create a view for majur payment summary
CREATE OR REPLACE VIEW majur_payment_summary AS
SELECT 
    mp.majur_id,
    mp.majur_name,
    COUNT(*) as total_payments,
    SUM(mp.amount) as total_amount,
    MAX(mp.payment_date) as last_payment_date,
    MIN(mp.payment_date) as first_payment_date,
    AVG(mp.amount) as average_payment,
    EXTRACT(MONTH FROM mp.payment_date) as payment_month,
    EXTRACT(YEAR FROM mp.payment_date) as payment_year
FROM majur_payments mp
GROUP BY mp.majur_id, mp.majur_name, EXTRACT(MONTH FROM mp.payment_date), EXTRACT(YEAR FROM mp.payment_date)
ORDER BY mp.majur_name, payment_year DESC, payment_month DESC;

-- Grant view permissions
GRANT SELECT ON majur_payment_summary TO authenticated;
GRANT SELECT ON majur_payment_summary TO service_role;

-- Create a view for current month majur totals (for dashboard)
CREATE OR REPLACE VIEW current_month_majur_totals AS
SELECT 
    mp.majur_id,
    mp.majur_name,
    COALESCE(SUM(mp.amount), 0) as received_amount,
    COUNT(mp.id) as payment_count,
    MAX(mp.payment_date) as last_payment_date
FROM majur_payments mp
WHERE EXTRACT(MONTH FROM mp.payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM mp.payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY mp.majur_id, mp.majur_name
ORDER BY mp.majur_name;

-- Grant view permissions
GRANT SELECT ON current_month_majur_totals TO authenticated;
GRANT SELECT ON current_month_majur_totals TO service_role;

COMMENT ON TABLE majur_payments IS 'Store payments made to majurs by admin with audit trail';
COMMENT ON COLUMN majur_payments.majur_id IS 'ID of the majur receiving payment';
COMMENT ON COLUMN majur_payments.majur_name IS 'Name of the majur for easy reference';
COMMENT ON COLUMN majur_payments.amount IS 'Amount paid to the majur';
COMMENT ON COLUMN majur_payments.payment_date IS 'Date when payment was made';
COMMENT ON COLUMN majur_payments.notes IS 'Additional notes about the payment';
COMMENT ON COLUMN majur_payments.recorded_by IS 'Admin who recorded this payment';
COMMENT ON VIEW majur_payment_summary IS 'Summary of payments by majur and month for analysis';
COMMENT ON VIEW current_month_majur_totals IS 'Current month payment totals for majur dashboard display';