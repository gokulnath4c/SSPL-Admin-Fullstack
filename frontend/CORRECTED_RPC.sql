-- ✅ CORRECTED RPC FUNCTION - with proper type casting

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
    NULL::DECIMAL,
    NULL::VARCHAR,
    NULL::VARCHAR,
    NULL::VARCHAR,
    NULL::TIMESTAMP
  FROM player_registrations pr
  ORDER BY pr.created_at DESC;
END;
$$;

-- Test it:
-- SELECT * FROM get_all_player_registrations() LIMIT 20;
