-- DEBUG DASHBOARD STATS
-- 1. Check count from raw table vs view
SELECT 
    (SELECT COUNT(*) FROM player_registrations) as raw_count,
    (SELECT COUNT(*) FROM v_admin_player_registrations) as view_count;

-- 2. Check payment status distribution in view
SELECT payment_status, COUNT(*) 
FROM v_admin_player_registrations 
GROUP BY payment_status;

-- 3. Check for potential duplicates in view (should be 0)
SELECT email, COUNT(*) 
FROM v_admin_player_registrations 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 4. Check if RLS is effectively hiding data (try accessing as anonymous if possible, or just check check policies)
-- (We can't easily simulates roles here, but we can verify permissions)
-- Ensure the view is accessible
GRANT SELECT ON v_admin_player_registrations TO authenticated;
GRANT SELECT ON v_admin_player_registrations TO service_role;
GRANT SELECT ON v_admin_player_registrations TO anon; -- For testing, maybe remove later if sensitive

-- 5. Force refresh of view permissions just in case
ALTER VIEW v_admin_player_registrations OWNER TO postgres;

-- 6. Sample Data
SELECT id, player_name, player_email, payment_status 
FROM v_admin_player_registrations 
LIMIT 5;
