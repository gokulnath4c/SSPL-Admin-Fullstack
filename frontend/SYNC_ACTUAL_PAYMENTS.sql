-- ✅ SYNC ACTUAL PLAYER DATA WITH PAYMENTS

-- Step 1: First, let's see what we have
-- Check actual player registrations (your real data)
SELECT COUNT(*) as actual_player_count FROM player_registrations;

-- Check demo registrations (test data we added)
SELECT COUNT(*) as demo_registration_count FROM registrations;

-- Step 2: CLEAR demo data (optional - do this if you want to start fresh)
DELETE FROM payments;
DELETE FROM registrations;

-- Step 3: Create registrations for ACTUAL player data from player_registrations
INSERT INTO registrations (player_id, trial_id, state, status, registration_date, notes)
SELECT 
  pr.id as player_id,
  (SELECT id FROM trials LIMIT 1) as trial_id,  -- Assign first trial (or modify as needed)
  pr.state,
  'approved' as status,
  pr.created_at as registration_date,
  CONCAT('Auto-created from player registration: ', pr.full_name) as notes
FROM player_registrations pr
WHERE NOT EXISTS (
  SELECT 1 FROM registrations WHERE registrations.player_id = pr.id
)
ORDER BY pr.created_at DESC;

-- Step 4: Create payment records for these registrations
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

-- Step 5: Verify the data now
SELECT 
  r.id as registration_id,
  pr.full_name,
  pr.email,
  p.amount,
  p.status,
  p.payment_date,
  p.order_id,
  p.payment_id
FROM registrations r
LEFT JOIN payments p ON p.registration_id = r.id
LEFT JOIN player_registrations pr ON r.player_id = pr.id
ORDER BY r.id DESC
LIMIT 30;

-- Step 6: Now you can update payment statuses from Razorpay
-- Example: Mark some as completed
UPDATE payments 
SET 
  status = 'completed',
  payment_date = CURRENT_TIMESTAMP
WHERE registration_id IN (
  SELECT id FROM registrations ORDER BY id LIMIT 5
);

-- Verify final result
SELECT 
  r.id as registration_id,
  pr.full_name,
  pr.email,
  pr.phone,
  p.amount,
  p.status as payment_status,
  p.payment_date,
  p.order_id
FROM registrations r
LEFT JOIN payments p ON p.registration_id = r.id
LEFT JOIN player_registrations pr ON r.player_id = pr.id
ORDER BY pr.created_at DESC
LIMIT 30;
