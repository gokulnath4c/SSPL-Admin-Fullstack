-- Create a view that returns unique player registrations for the dashboard
-- It keeps the most recent record for each email
-- Includes trial_name field required by dashboard analytics

-- Drop the existing view first to avoid column name conflicts
DROP VIEW IF EXISTS v_admin_player_registrations CASCADE;

-- Create the view with the correct structure
CREATE VIEW v_admin_player_registrations AS
SELECT DISTINCT ON (email)
  id,
  full_name as player_name,
  email as player_email,
  phone,
  created_at as registration_date,
  state,
  city,
  pincode,
  payment_status,
  payment_amount,
  status,
  position,
  'General' as trial_name,  -- Default trial name for dashboard compatibility
  CONCAT('Position: ', position) as notes
FROM player_registrations
ORDER BY email, created_at DESC;
