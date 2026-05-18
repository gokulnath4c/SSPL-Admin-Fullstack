-- ✅ CORRECT RPC FUNCTION FOR YOUR SCHEMA
-- This works with your actual player_registrations and registrations tables

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
    pr.id,
    pr.full_name,
    pr.email,
    pr.phone,
    pr.date_of_birth,
    pr.state,
    pr.city,
    pr.pincode,
    pr."position",
    pr.preferred_trials,
    pr.created_at,
    CAST(NULL AS DECIMAL),  -- No payment data in this schema
    CAST(NULL AS VARCHAR),  -- No payment status
    CAST(NULL AS VARCHAR),  -- No order_id
    CAST(NULL AS VARCHAR),  -- No payment_id
    CAST(NULL AS TIMESTAMP) -- No payment_date
  FROM player_registrations pr
  ORDER BY pr.created_at DESC;
END;
$$;

-- Test it:
-- SELECT * FROM get_all_player_registrations() LIMIT 20;


-- ═══════════════════════════════════════════════════════════════════════════
-- ALTERNATIVE: If you want to JOIN player_registrations with registrations
-- You need to find how they're connected
-- ═══════════════════════════════════════════════════════════════════════════

-- First, let's check if there's ANY relationship:
-- SELECT COUNT(*) FROM player_registrations LIMIT 5;
-- SELECT COUNT(*) FROM registrations LIMIT 5;

-- Then try:
-- SELECT pr.id, pr.full_name, r.* 
-- FROM player_registrations pr
-- FULL OUTER JOIN registrations r ON pr.id = r.player_id
-- LIMIT 10;

-- If player_id in registrations IS actually the player_registrations.id:
-- Then use this function:

CREATE OR REPLACE FUNCTION get_all_player_registrations_with_payments()
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
    pr.id,
    pr.full_name,
    pr.email,
    pr.phone,
    pr.date_of_birth,
    COALESCE(pr.state, r.state) AS state,
    pr.city,
    pr.pincode,
    pr."position",
    pr.preferred_trials,
    pr.created_at,
    r.amount,
    r.status,
    r.order_id,
    r.payment_id,
    r.created_at
  FROM player_registrations pr
  LEFT JOIN registrations r ON pr.id = r.player_id
  ORDER BY pr.created_at DESC;
END;
$$;

-- Test it:
-- SELECT * FROM get_all_player_registrations_with_payments() LIMIT 20;
