-- ✅ FIX: ALTER STATE COLUMN TO ACCEPT LONGER VALUES

-- First, let's modify the registrations table to allow longer state values
ALTER TABLE registrations 
  ALTER COLUMN state TYPE VARCHAR(100);

-- Now try the insert again
INSERT INTO registrations (player_id, trial_id, state, status, registration_date, notes)
SELECT 
  pr.id as player_id,
  (SELECT id FROM trials LIMIT 1) as trial_id,
  pr.state,
  'approved' as status,
  pr.created_at as registration_date,
  CONCAT('Auto-created from: ', pr.full_name) as notes
FROM player_registrations pr
WHERE NOT EXISTS (
  SELECT 1 FROM registrations WHERE registrations.player_id = pr.id
)
ORDER BY pr.created_at DESC;

-- Verify registrations were created
SELECT COUNT(*) as total_registrations FROM registrations;

-- View sample registrations
SELECT id, player_id, state, status, registration_date FROM registrations LIMIT 10;
