-- ✅ FIX: CREATE PLAYERS FROM ACTUAL PLAYER_REGISTRATIONS DATA

-- Step 1: Insert players from player_registrations table
INSERT INTO players (id, name, email, phone)
SELECT DISTINCT
  pr.id as id,
  pr.full_name as name,
  pr.email as email,
  pr.phone as phone
FROM player_registrations pr
WHERE NOT EXISTS (
  SELECT 1 FROM players WHERE players.id = pr.id
);

-- Verify players were created
SELECT COUNT(*) as total_players FROM players;

-- Step 2: Now create registrations for actual player data
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

-- Verify registrations created
SELECT COUNT(*) as total_registrations FROM registrations;

-- Step 3: Create payments for these registrations
INSERT INTO payments (registration_id, amount, status, payment_date, order_id, payment_id)
SELECT 
  r.id as registration_id,
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

-- Step 4: View the final result
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
