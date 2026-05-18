-- Create a robust view for the admin panel that joins player_registrations with registrations
-- to get complete payment details and ensures all 7000+ records are available.

CREATE OR REPLACE VIEW v_admin_player_registrations AS
SELECT 
  p.id,
  p.full_name as player_name,
  p.email as player_email,
  p.phone,
  p.state,
  p.city,
  p.pincode,
  p.position,
  p.date_of_birth,
  p.preferred_trials,
  
  -- Coalesce payment details from both tables to ensure accuracy
  COALESCE(r.status, p.payment_status) AS payment_status,
  COALESCE(r.amount, p.payment_amount) AS payment_amount,
  COALESCE(r.payment_id, p.razorpay_payment_id) AS razorpay_payment_id,
  COALESCE(r.order_id, p.razorpay_order_id) AS razorpay_order_id,
  
  -- Use the most relevant date
  p.created_at as registration_date,
  p.updated_at,
  
  -- Computed/Derived status
  CASE 
    WHEN COALESCE(r.status, p.payment_status) = 'completed' THEN 'approved'
    ELSE COALESCE(p.status, 'pending')
  END as status

FROM player_registrations p
LEFT JOIN registrations r
  ON r.registration_id = p.id::text;

-- Grant access to this view
GRANT SELECT ON v_admin_player_registrations TO authenticated;
GRANT SELECT ON v_admin_player_registrations TO service_role;
GRANT SELECT ON v_admin_player_registrations TO anon;
