-- ✅ SAFE INSERT - ONLY NEW PLAYERS

-- Step 1: Insert only NEW players (those not already in players table)
INSERT INTO players (id, name, email, phone)
SELECT DISTINCT ON (pr.email)
  pr.id,
  pr.full_name,
  pr.email,
  pr.phone
FROM player_registrations pr
WHERE pr.id NOT IN (SELECT id FROM players)
  AND pr.email NOT IN (SELECT email FROM players)
ORDER BY pr.email, pr.created_at DESC;

-- Verify how many new players were added
SELECT COUNT(*) as total_players FROM players;

-- Step 2: Create registrations for players (only new ones)
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

-- Verify registrations
SELECT COUNT(*) as total_registrations FROM registrations;

-- Step 3: Create payments for registrations (only new ones)
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

-- Verify payments
SELECT COUNT(*) as total_payments FROM payments;

-- Step 4: View the complete data
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
LIMIT 50;
