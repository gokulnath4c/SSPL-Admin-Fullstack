-- ✅ ADD MISSING COLUMNS TO PAYMENTS TABLE

-- First, check if the columns exist
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'payments';

-- Add the missing columns if they don't exist
ALTER TABLE IF EXISTS payments 
ADD COLUMN IF NOT EXISTS order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);

-- Verify the columns were added:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payments' ORDER BY ordinal_position;
