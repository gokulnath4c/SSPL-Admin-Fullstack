-- Calculate expected total: 2572 * 825 = 2,121,900

-- Check for records named as 'captured' or 'completed' that DON'T have 825 as the amount
SELECT count(*) as invalid_amount_count 
FROM player_registrations 
WHERE (payment_status = 'captured' OR payment_status = 'completed') 
AND (payment_amount IS NULL OR payment_amount != 825);

-- Update them to 825
UPDATE player_registrations
SET payment_amount = 825
WHERE (payment_status = 'captured' OR payment_status = 'completed')
AND (payment_amount IS NULL OR payment_amount != 825);
