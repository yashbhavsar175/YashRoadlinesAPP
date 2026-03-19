-- Performance indexes for agency_payments table
-- Run this in the Supabase SQL editor to speed up getAgencyPayments queries

CREATE INDEX IF NOT EXISTS idx_agency_payments_office_id ON agency_payments(office_id);
CREATE INDEX IF NOT EXISTS idx_agency_payments_date ON agency_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_agency_payments_agency_id ON agency_payments(agency_id);
