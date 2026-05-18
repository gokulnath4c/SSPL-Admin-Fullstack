-- Create razorpay_ledger table
CREATE TABLE IF NOT EXISTS razorpay_ledger (
  payment_id TEXT PRIMARY KEY,
  order_id TEXT,
  amount DECIMAL(20, 2),
  currency TEXT,
  status TEXT,
  method TEXT,
  email TEXT,
  contact TEXT,
  fee DECIMAL(20, 2),
  tax DECIMAL(20, 2),
  created_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  raw_payload JSONB,
  reconciliation_status TEXT DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_razorpay_ledger_created_at ON razorpay_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_razorpay_ledger_status ON razorpay_ledger(status);

-- Enable Row Level Security (RLS)
ALTER TABLE razorpay_ledger ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to authenticated users (admin)
CREATE POLICY "Allow read access to authenticated users" 
ON razorpay_ledger FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Allow insert/update only to service_role (backend)
-- Note: 'anon' key might be used if service_role is not available, proceed with caution or ask user for setup
CREATE POLICY "Allow all access to service_role" 
ON razorpay_ledger FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
