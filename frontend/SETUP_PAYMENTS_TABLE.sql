-- ✅ STEP 1: CREATE PAYMENTS TABLE

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

-- ✅ STEP 2: UPDATED RPC FUNCTION - WITH PAYMENTS JOIN

CREATE OR REPLACE FUNCTION get_all_player_registrations()
RETURNS TABLE (
  player_id UUID,
  full_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  date_of_birth DATE,
  state VARCHAR,
  city VARCHAR,
  pincode VARCHAR,
  player_position VARCHAR,
  preferred_trials VARCHAR,
  registration_date TIMESTAMP,
  payment_amount DECIMAL,
  payment_status VARCHAR,
  order_id VARCHAR,
  payment_id VARCHAR,
  payment_date TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id::UUID,
    pr.full_name::VARCHAR,
    pr.email::VARCHAR,
    pr.phone::VARCHAR,
    pr.date_of_birth::DATE,
    pr.state::VARCHAR,
    pr.city::VARCHAR,
    pr.pincode::VARCHAR,
    pr."position"::VARCHAR,
    pr.preferred_trials::VARCHAR,
    COALESCE(r.registration_date, pr.created_at)::TIMESTAMP,
    p.amount::DECIMAL,
    p.status::VARCHAR,
    p.order_id::VARCHAR,
    p.payment_id::VARCHAR,
    p.payment_date::TIMESTAMP
  FROM player_registrations pr
  LEFT JOIN registrations r ON r.player_id = pr.id
  LEFT JOIN payments p ON p.registration_id = r.id
  ORDER BY pr.created_at DESC;
END;
$$;

-- Test it:
-- SELECT * FROM get_all_player_registrations() LIMIT 20;

-- Verify payment data is joining correctly:
-- SELECT full_name, email, payment_status, payment_amount 
-- FROM get_all_player_registrations() 
-- WHERE payment_amount IS NOT NULL 
-- LIMIT 10;
