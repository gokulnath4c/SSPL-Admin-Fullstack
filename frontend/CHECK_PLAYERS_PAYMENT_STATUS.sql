-- ✅ COMPLETE PLAYERS DATA WITH PAYMENT STATUS

-- Query 1: All players with payment information
SELECT 
  p.id as player_id,
  p.name as player_name,
  p.email,
  p.phone,
  r.id as registration_id,
  r.state,
  r.status as registration_status,
  r.registration_date,
  t.name as trial_name,
  pay.id as payment_id,
  pay.amount as payment_amount,
  pay.status as payment_status,
  pay.payment_date,
  pay.order_id,
  pay.payment_id as razorpay_id
FROM players p
LEFT JOIN registrations r ON r.player_id = p.id
LEFT JOIN trials t ON r.trial_id = t.id
LEFT JOIN payments pay ON pay.registration_id = r.id
ORDER BY p.name ASC;

-- Query 2: Summary - Payment Status Count
SELECT 
  COALESCE(pay.status, 'no_payment') as payment_status,
  COUNT(DISTINCT p.id) as player_count
FROM players p
LEFT JOIN registrations r ON r.player_id = p.id
LEFT JOIN payments pay ON pay.registration_id = r.id
GROUP BY pay.status
ORDER BY player_count DESC;

-- Query 3: Pending payments (to update from Razorpay)
SELECT 
  p.id as player_id,
  p.name,
  p.email,
  p.phone,
  r.state,
  pay.amount,
  pay.status as payment_status,
  pay.order_id,
  pay.payment_id,
  r.registration_date
FROM players p
LEFT JOIN registrations r ON r.player_id = p.id
LEFT JOIN payments pay ON pay.registration_id = r.id
WHERE pay.status = 'pending'
ORDER BY r.registration_date DESC;

-- Query 4: Completed payments
SELECT 
  p.id as player_id,
  p.name,
  p.email,
  p.phone,
  r.state,
  pay.amount,
  pay.status as payment_status,
  pay.payment_date,
  r.registration_date
FROM players p
LEFT JOIN registrations r ON r.player_id = p.id
LEFT JOIN payments pay ON pay.registration_id = r.id
WHERE pay.status = 'completed'
ORDER BY pay.payment_date DESC;

-- Query 5: Count statistics
SELECT 
  COUNT(DISTINCT p.id) as total_players,
  COUNT(DISTINCT r.id) as total_registrations,
  COUNT(DISTINCT pay.id) as total_payments,
  SUM(CASE WHEN pay.status = 'completed' THEN 1 ELSE 0 END) as completed_payments,
  SUM(CASE WHEN pay.status = 'pending' THEN 1 ELSE 0 END) as pending_payments,
  SUM(CASE WHEN pay.status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
  SUM(COALESCE(pay.amount, 0)) as total_amount_collected,
  SUM(CASE WHEN pay.status = 'completed' THEN pay.amount ELSE 0 END) as completed_amount
FROM players p
LEFT JOIN registrations r ON r.player_id = p.id
LEFT JOIN payments pay ON pay.registration_id = r.id;
