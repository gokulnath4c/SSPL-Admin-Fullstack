-- ✅ UPDATE PAYMENT AMOUNTS WITH GST AND RAZORPAY STATUS

-- Step 1: Update all payment amounts to 699 + 18% GST = 825.82
UPDATE payments
SET amount = 825.82
WHERE amount != 825.82;

-- Verify amounts updated
SELECT COUNT(*) as updated_payments FROM payments WHERE amount = 825.82;

-- Step 2: To integrate with Razorpay, you need to:
-- 1. Fetch orders from Razorpay API
-- 2. Update payment status based on Razorpay response

-- For now, let's create a query template to update payment status from order_id
-- This would be done programmatically in your backend/frontend

-- Example: Update specific payment based on Razorpay order_id
-- UPDATE payments
-- SET status = 'completed',
--     payment_date = NOW()
-- WHERE order_id = 'your_razorpay_order_id';

-- Step 3: View updated payments with new amounts
SELECT 
  p.id as payment_id,
  p.amount,
  p.status as payment_status,
  p.order_id,
  p.payment_id as razorpay_payment_id,
  r.registration_date,
  pl.name as player_name,
  pl.email
FROM payments p
LEFT JOIN registrations r ON p.registration_id = r.id
LEFT JOIN players pl ON r.player_id = pl.id
ORDER BY r.registration_date DESC
LIMIT 50;

-- Step 4: Summary - Total revenue
SELECT 
  COUNT(*) as total_payments,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(amount) as total_amount,
  SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_amount
FROM payments;

-- Step 5: Calculation breakdown
SELECT 
  '699' as base_amount,
  '18%' as gst_rate,
  ROUND(699 * 0.18, 2) as gst_amount,
  ROUND(699 + (699 * 0.18), 2) as total_amount;
