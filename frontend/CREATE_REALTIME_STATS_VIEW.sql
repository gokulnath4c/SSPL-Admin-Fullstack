-- Create a view that returns unique player registrations for the dashboard
-- It keeps the most recent record for each email to ensure distinct counts
DROP VIEW IF EXISTS v_admin_player_registrations CASCADE;

CREATE VIEW v_admin_player_registrations AS
SELECT DISTINCT ON (email)
  id,
  full_name as player_name,
  email,
  phone,
  created_at,
  state,
  city,
  pincode,
  payment_status,
  payment_amount,
  status,
  position,
  date_of_birth
FROM player_registrations
ORDER BY email, created_at DESC;

-- Grant access to this view
GRANT SELECT ON v_admin_player_registrations TO authenticated;
GRANT SELECT ON v_admin_player_registrations TO service_role;
GRANT SELECT ON v_admin_player_registrations TO anon;
