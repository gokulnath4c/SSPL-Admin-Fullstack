-- Identify duplicate player registrations with 'captured' payment status
SELECT 
    email, 
    phone,
    COUNT(*) as count,
    string_agg(id::text, ', ') as ids,
    string_agg(payment_status, ', ') as statuses,
    string_agg(created_at::text, ', ') as created_ats
FROM player_registrations 
WHERE payment_status = 'captured'
GROUP BY email, phone
HAVING COUNT(*) > 1
ORDER BY count DESC;
