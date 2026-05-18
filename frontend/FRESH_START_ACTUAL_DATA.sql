-- ✅ COMPLETE FRESH START WITH ACTUAL PLAYER DATA ONLY

-- Step 1: Clear all demo data
DELETE FROM payments;
DELETE FROM registrations;
DELETE FROM players;
DELETE FROM trials;

-- Step 2: Create trials
INSERT INTO trials (name, description) VALUES
  ('Weekdays', 'Weekday trials'),
  ('Weekends', 'Weekend trials'),
  ('Both', 'Both weekdays and weekends');

-- Step 3: Insert players from actual player_registrations
INSERT INTO players (id, name, email, phone)
SELECT DISTINCT ON (pr.email)
  pr.id,
  pr.full_name,
  pr.email,
  pr.phone
FROM player_registrations pr
ORDER BY pr.email, pr.created_at DESC;

-- Verify players created
SELECT COUNT(*) as total_players FROM players;

-- Step 4: Create registrations for actual players
INSERT INTO registrations (player_id, trial_id, state, status, registration_date, notes)
SELECT 
  p.id as player_id,
  (SELECT id FROM trials LIMIT 1) as trial_id,
  pr.state,
  'approved' as status,
  pr.created_at as registration_date,
  CONCAT('Auto-created from: ', pr.full_name) as notes
FROM player_registrations pr
JOIN players p ON p.id = pr.id
WHERE NOT EXISTS (
  SELECT 1 FROM registrations WHERE registrations.player_id = p.id
)
ORDER BY pr.created_at DESC;

-- Verify registrations created
SELECT COUNT(*) as total_registrations FROM registrations;

-- Step 5: Create payments for registrations
INSERT INTO payments (registration_id, amount, status, payment_date, order_id, payment_id)
SELECT 
  r.id,
  500.00 as amount,
  'pending' as status,
  NULL as payment_date,
  'order_' || r.id::text as order_id,
  'pay_' || r.id::text as payment_id
FROM registrations r
WHERE NOT EXISTS (
  SELECT 1 FROM payments WHERE payments.registration_id = r.id
);

-- Verify payments created
SELECT COUNT(*) as total_payments FROM payments;

-- Step 6: View the final result
SELECT 
  r.id as registration_id,
  p.name as player_name,
  p.email,
  p.phone,
  r.state,
  pay.amount,
  pay.status as payment_status,
  r.registration_date
FROM registrations r
LEFT JOIN players p ON r.player_id = p.id
LEFT JOIN payments pay ON pay.registration_id = r.id
ORDER BY r.registration_date DESC
LIMIT 30;
