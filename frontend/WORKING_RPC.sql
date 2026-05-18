-- ✅ CORRECTED RPC FUNCTION - WORKS WITH ACTUAL SCHEMA

-- Your registrations table has: id, player_id, trial_id, state, registration_date, status, notes, created_at, updated_at
-- Payment data appears to be stored as 'status' in the registrations table

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
    pr.created_at::TIMESTAMP,
    NULL::DECIMAL as payment_amount,
    NULL::VARCHAR as payment_status,
    NULL::VARCHAR as order_id,
    NULL::VARCHAR as payment_id,
    NULL::TIMESTAMP as payment_date
  FROM player_registrations pr
  ORDER BY pr.created_at DESC;
END;
$$;

-- Test it:
-- SELECT * FROM get_all_player_registrations() LIMIT 20;

-- Note: Your registrations table doesn't have payment amount/order/payment_id columns yet
-- If you want to add payment data, you need to either:
-- 1. Add payment columns to registrations table, OR
-- 2. Create a separate payments table and JOIN it
