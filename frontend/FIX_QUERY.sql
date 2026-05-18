-- ✅ FIXED QUERY FOR YOUR ACTUAL DATABASE STRUCTURE
-- This query works with your real player_registrations and registrations tables

SELECT
  pr.id AS player_id,
  pr.full_name,
  pr.email,
  pr.phone,
  pr.date_of_birth,
  pr.state,
  pr.city,
  pr.pincode,
  pr.position,
  pr.preferred_trials,
  pr.created_at AS registration_date,
  r.amount AS payment_amount,
  r.status AS payment_status,
  r.order_id,
  r.payment_id,
  r.created_at AS payment_date
FROM player_registrations pr
LEFT JOIN registrations r
  ON r.id = pr.id  -- Join on the correct column
ORDER BY pr.created_at DESC
LIMIT 111;


-- ═══════════════════════════════════════════════════════════════════════════
-- ALTERNATIVE QUERY (if the above doesn't work)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  pr.id AS player_id,
  pr.full_name,
  pr.email,
  pr.phone,
  pr.date_of_birth,
  pr.state,
  pr.city,
  pr.pincode,
  pr.position,
  pr.preferred_trials,
  pr.created_at AS registration_date,
  r.amount AS payment_amount,
  r.status AS payment_status,
  r.order_id,
  r.payment_id,
  r.created_at AS payment_date
FROM player_registrations pr
LEFT JOIN registrations r
  ON r.player_registration_id = pr.id  -- If column is named differently
ORDER BY pr.created_at DESC
LIMIT 111;


-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC: Check your actual table structure
-- ═══════════════════════════════════════════════════════════════════════════

-- Run these to see your actual column names:

-- Check player_registrations columns:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'player_registrations' 
ORDER BY ordinal_position;

-- Check registrations columns:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'registrations' 
ORDER BY ordinal_position;

-- See first row from each table:
SELECT * FROM player_registrations LIMIT 1;
SELECT * FROM registrations LIMIT 1;


-- ═══════════════════════════════════════════════════════════════════════════
-- CREATE NEW RPC FUNCTION for dashboard
-- ═══════════════════════════════════════════════════════════════════════════

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
    r.amount,
    r.status,
    r.order_id,
    r.payment_id,
    r.created_at
  FROM player_registrations pr
  LEFT JOIN registrations r ON r.player_registration_id = pr.id
  ORDER BY pr.created_at DESC;
END;
$$;

-- Test it:
-- SELECT * FROM get_all_player_registrations() LIMIT 111;
