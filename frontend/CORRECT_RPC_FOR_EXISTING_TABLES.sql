-- ✅ CORRECT RPC FUNCTION FOR EXISTING PLAYER_REGISTRATIONS TABLE
-- This RPC function works with your existing table structure without affecting existing data

-- First, drop the existing function if it exists with different return type
DROP FUNCTION IF EXISTS get_player_registrations();

-- Main RPC function that the admin panel is looking for
CREATE OR REPLACE FUNCTION get_player_registrations()
RETURNS TABLE (
  id UUID,
  player_name VARCHAR,
  player_email VARCHAR,
  phone VARCHAR,
  registration_date TIMESTAMP,
  state VARCHAR,
  trial_name VARCHAR,
  payment_status VARCHAR,
  payment_amount DECIMAL,
  status VARCHAR,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id::UUID,
    p.full_name::VARCHAR AS player_name,
    p.email::VARCHAR AS player_email,
    p.phone::VARCHAR,
    p.created_at::TIMESTAMP AS registration_date,
    p.state::VARCHAR,
    -- Use preferred_trials as trial_name since we don't have a separate trials table
    CASE
      WHEN p.preferred_trials IS NOT NULL THEN p.preferred_trials
      ELSE 'General Trial'
    END::VARCHAR AS trial_name,
    -- Use payment_status from player_registrations table
    COALESCE(p.payment_status, 'pending')::VARCHAR AS payment_status,
    -- Use payment_amount from player_registrations table
    COALESCE(p.payment_amount, 0)::DECIMAL AS payment_amount,
    -- Map status (default to approved for existing registrations)
    CASE
      WHEN p.payment_status = 'completed' THEN 'approved'
      ELSE 'pending'
    END::VARCHAR AS status,
    -- Create notes from available data
    CONCAT(
      'Registered: ', p.created_at::DATE, ' | ',
      'Position: ', COALESCE(p.position, 'Not specified'), ' | ',
      'Trials: ', COALESCE(p.preferred_trials, 'Not specified')
    )::TEXT AS notes
  FROM player_registrations p
  ORDER BY p.created_at DESC;
END;
$$;

-- Alternative RPC function for registrations page - FIXED to match PlayerRegistration type
DROP FUNCTION IF EXISTS get_all_player_registrations();

CREATE OR REPLACE FUNCTION get_all_player_registrations()
RETURNS TABLE (
  id UUID,
  player_name VARCHAR,
  player_email VARCHAR,
  phone VARCHAR,
  registration_date TIMESTAMP,
  status VARCHAR,
  payment_status VARCHAR,
  payment_amount DECIMAL,
  payment_date TIMESTAMP,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id::UUID,
    p.full_name::VARCHAR AS player_name,
    p.email::VARCHAR AS player_email,
    p.phone::VARCHAR,
    p.created_at::TIMESTAMP AS registration_date,
    -- Map status based on payment status
    CASE
      WHEN p.payment_status = 'completed' THEN 'approved'
      WHEN p.payment_status = 'captured' THEN 'approved'
      ELSE 'pending'
    END::VARCHAR AS status,
    -- Use payment_status from player_registrations
    COALESCE(p.payment_status, 'pending')::VARCHAR AS payment_status,
    -- Use payment_amount from player_registrations
    COALESCE(p.payment_amount, 0)::DECIMAL AS payment_amount,
    -- Use payment_date from player_registrations
    p.payment_date::TIMESTAMP AS payment_date,
    -- Create detailed notes with all registration data
    CONCAT(
      'Position: ', COALESCE(p.position, 'Not specified'), ' | ',
      'Trials: ', COALESCE(p.preferred_trials, 'Not specified'), ' | ',
      'State: ', COALESCE(p.state, 'Not specified'), ' | ',
      'City: ', COALESCE(p.city, 'Not specified'), ' | ',
      'Pincode: ', COALESCE(p.pincode, 'Not specified'), ' | ',
      'DOB: ', COALESCE(p.date_of_birth::TEXT, 'Not specified')
    )::TEXT AS notes
  FROM player_registrations p
  ORDER BY p.created_at DESC;
END;
$$;

-- Test the main RPC function
SELECT * FROM get_player_registrations() LIMIT 10;

-- Test the alternative RPC function
SELECT * FROM get_all_player_registrations() LIMIT 10;

-- Verify the data matches your existing query
SELECT
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.state,
  p.city,
  p.pincode,
  p.position,
  p.date_of_birth,
  p.preferred_trials,
  COALESCE(p.payment_status, 'pending') AS payment_status,
  COALESCE(p.payment_amount, 0) AS payment_amount,
  COALESCE(p.razorpay_payment_id, 'pay_' || p.id::text) AS razorpay_payment_id,
  COALESCE(p.razorpay_order_id, 'order_' || p.id::text) AS razorpay_order_id,
  p.created_at,
  p.updated_at
FROM player_registrations p
ORDER BY p.created_at DESC
LIMIT 10;