-- ✅ STEP 1: CREATE PAYMENTS TABLE (if it doesn't exist)

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2),
  order_id VARCHAR(255),
  payment_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON payments(registration_id);

-- Verify table was created:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payments';
