-- ✅ COMPLETE SETUP FOR ACTUAL PLAYER DATA

-- Step 1: Ensure trials table has data
INSERT INTO trials (name, description) VALUES
  ('Weekdays', 'Weekday trials'),
  ('Weekends', 'Weekend trials'),
  ('Both', 'Both weekdays and weekends')
ON CONFLICT DO NOTHING;

-- Verify trials were created
SELECT id, name FROM trials;

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
  pr.full_name,
  pr.email,
  pr.phone,
  pr.state,
  p.amount,
  p.status as payment_status,
  p.payment_date,
  r.registration_date
FROM registrations r
LEFT JOIN payments p ON p.registration_id = r.id
LEFT JOIN player_registrations pr ON r.player_id = pr.id
ORDER BY pr.created_at DESC
LIMIT 30;
