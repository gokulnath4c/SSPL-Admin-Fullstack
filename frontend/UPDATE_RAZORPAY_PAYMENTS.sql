-- ✅ UPDATING PAYMENTS WITH RAZORPAY DATA

-- First, let's see what payments currently exist
SELECT * FROM payments LIMIT 20;

-- Check registrations with their IDs
SELECT id, player_id FROM registrations LIMIT 20;

-- To update payment status from Razorpay, you need to:
-- 1. Get payment data from Razorpay API
-- 2. Map Razorpay order_id to registration_id
-- 3. Update the payments table

-- Example: Update a specific payment (replace with your actual data)
UPDATE payments 
SET 
  status = 'completed',
  payment_date = CURRENT_TIMESTAMP,
  amount = 500.00,
  order_id = 'order_1234567890',
  payment_id = 'pay_1234567890'
WHERE registration_id = (SELECT id FROM registrations LIMIT 1);

-- Or insert new payments if they don't exist:
INSERT INTO payments (registration_id, amount, status, payment_date, order_id, payment_id)
SELECT 
  r.id,
  500.00,
  'completed',
  CURRENT_TIMESTAMP,
  'order_' || r.id::text,
  'pay_' || r.id::text
FROM registrations r
WHERE NOT EXISTS (
  SELECT 1 FROM payments WHERE payments.registration_id = r.id
);

-- Verify updates:
SELECT 
  r.id as registration_id,
  pr.full_name,
  p.amount,
  p.status,
  p.payment_date,
  p.order_id,
  p.payment_id
FROM registrations r
LEFT JOIN payments p ON p.registration_id = r.id
LEFT JOIN player_registrations pr ON r.player_id = pr.id
ORDER BY r.id DESC
LIMIT 20;
