-- Create cash_records table for tracking admin cash verification
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cash_records (
    id VARCHAR(255) PRIMARY KEY,
    expected_amount DECIMAL(10,2) NOT NULL,
    actual_amount DECIMAL(10,2),
    notes TEXT,
    setup_time TIMESTAMPTZ NOT NULL,
    verification_time TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending_verification', 'verified_correct', 'verified_incorrect')),
    admin_id VARCHAR(255) NOT NULL,
    difference DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cash_records_status ON cash_records(status);
CREATE INDEX IF NOT EXISTS idx_cash_records_admin_id ON cash_records(admin_id);
CREATE INDEX IF NOT EXISTS idx_cash_records_setup_time ON cash_records(setup_time);
CREATE INDEX IF NOT EXISTS idx_cash_records_created_at ON cash_records(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_cash_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS cash_records_updated_at_trigger ON cash_records;
CREATE TRIGGER cash_records_updated_at_trigger
    BEFORE UPDATE ON cash_records
    FOR EACH ROW
    EXECUTE FUNCTION update_cash_records_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE cash_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view all cash records" ON cash_records;
CREATE POLICY "Admin can view all cash records" ON cash_records
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
        OR 
        auth.email() = 'lbhavsar31@gmail.com'
    );

DROP POLICY IF EXISTS "Admin can insert cash records" ON cash_records;
CREATE POLICY "Admin can insert cash records" ON cash_records
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
        OR 
        auth.email() = 'lbhavsar31@gmail.com'
    );

DROP POLICY IF EXISTS "Admin can update cash records" ON cash_records;
CREATE POLICY "Admin can update cash records" ON cash_records
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
        OR 
        auth.email() = 'lbhavsar31@gmail.com'
    );

DROP POLICY IF EXISTS "Admin can delete cash records" ON cash_records;
CREATE POLICY "Admin can delete cash records" ON cash_records
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.is_admin = true
        )
        OR 
        auth.email() = 'lbhavsar31@gmail.com'
    );

-- Insert some sample data for testing (optional)
-- INSERT INTO cash_records (id, expected_amount, notes, setup_time, status, admin_id) 
-- VALUES ('cash_sample_1', 15000.00, 'Daily cash collection test', CURRENT_TIMESTAMP, 'pending_verification', 'admin');

-- Grant necessary permissions
GRANT ALL ON cash_records TO authenticated;
GRANT ALL ON cash_records TO service_role;

-- Create a view for easy cash record analysis
CREATE OR REPLACE VIEW cash_verification_summary AS
SELECT 
    id,
    expected_amount,
    actual_amount,
    difference,
    status,
    setup_time::DATE as setup_date,
    verification_time::DATE as verification_date,
    notes,
    CASE 
        WHEN status = 'verified_correct' THEN 'Match ✅'
        WHEN status = 'verified_incorrect' AND difference > 0 THEN 'Excess Cash ⚠️'
        WHEN status = 'verified_incorrect' AND difference < 0 THEN 'Short Cash ❌'
        ELSE 'Pending 🕐'
    END as verification_status,
    CASE 
        WHEN status = 'verified_correct' THEN 0
        WHEN status = 'verified_incorrect' THEN 1
        ELSE 2
    END as priority_order
FROM cash_records
ORDER BY setup_time DESC;

-- Grant view permissions
GRANT SELECT ON cash_verification_summary TO authenticated;
GRANT SELECT ON cash_verification_summary TO service_role;

COMMENT ON TABLE cash_records IS 'Store admin cash verification records with audit trail';
COMMENT ON COLUMN cash_records.expected_amount IS 'Amount admin expects to receive when leaving office';
COMMENT ON COLUMN cash_records.actual_amount IS 'Actual amount admin received during verification';
COMMENT ON COLUMN cash_records.difference IS 'Calculated difference (actual - expected)';
COMMENT ON COLUMN cash_records.status IS 'Verification status: pending_verification, verified_correct, verified_incorrect';
COMMENT ON VIEW cash_verification_summary IS 'Summary view for cash verification analysis with user-friendly status';