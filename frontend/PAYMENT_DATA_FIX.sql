-- ✅ IMPROVED RPC FUNCTION - WITH PAYMENT DATA JOIN

-- This function properly joins player_registrations with registrations table
-- to fetch both player and payment information

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
    r.amount::DECIMAL,
    r.status::VARCHAR,
    r.order_id::VARCHAR,
    r.payment_id::VARCHAR,
    r.updated_at::TIMESTAMP
  FROM player_registrations pr
  LEFT JOIN registrations r ON r.player_id = pr.id
  ORDER BY pr.created_at DESC;
END;
$$;

-- Test it with:
-- SELECT * FROM get_all_player_registrations() LIMIT 20;

-- To verify payment columns are populated:
-- SELECT 
--   full_name, 
--   email, 
--   payment_status, 
--   payment_amount, 
--   payment_date 
-- FROM get_all_player_registrations() 
-- WHERE payment_amount IS NOT NULL 
-- LIMIT 10;
