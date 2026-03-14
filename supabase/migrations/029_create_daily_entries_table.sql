-- Create daily_entries table for storing daily entry records
CREATE TABLE IF NOT EXISTS public.daily_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Entry amounts (stored as JSONB for flexibility)
  entries JSONB NOT NULL DEFAULT '{}',
  
  -- Calculated totals
  total_credit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_debit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_profit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT daily_entries_total_credit_check CHECK (total_credit >= 0),
  CONSTRAINT daily_entries_total_debit_check CHECK (total_debit >= 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_entries_user_id ON public.daily_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_entries_office_id ON public.daily_entries(office_id);
CREATE INDEX IF NOT EXISTS idx_daily_entries_entry_date ON public.daily_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_entries_created_at ON public.daily_entries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own entries
CREATE POLICY "Users can view own daily entries"
  ON public.daily_entries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own entries
CREATE POLICY "Users can insert own daily entries"
  ON public.daily_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "Users can update own daily entries"
  ON public.daily_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete own daily entries"
  ON public.daily_entries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admin can view all entries
CREATE POLICY "Admin can view all daily entries"
  ON public.daily_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_daily_entries_updated_at_trigger
  BEFORE UPDATE ON public.daily_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_entries_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_entries TO authenticated;

-- Add comment
COMMENT ON TABLE public.daily_entries IS 'Stores daily entry records with credit/debit categories and calculated totals';
