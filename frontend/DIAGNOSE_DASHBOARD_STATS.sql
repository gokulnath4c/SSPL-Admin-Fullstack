-- DIAGNOSE DASHBOARD STATS
-- Run this to understand the data discrepency

SELECT 'Raw Count' as metric, count(*) as value FROM player_registrations
UNION ALL
SELECT 'Unique Emails', count(DISTINCT email) FROM player_registrations
UNION ALL
SELECT 'Unique Phones', count(DISTINCT phone) FROM player_registrations
UNION ALL
SELECT 'View Count (v_admin_player_registrations)', count(*) FROM v_admin_player_registrations
UNION ALL
SELECT 'Completed Payments (Raw)', count(*) FROM player_registrations WHERE payment_status IN ('captured', 'completed')
UNION ALL
SELECT 'Completed Payments (Unique Email)', count(*) FROM (
  SELECT DISTINCT ON (email) * FROM player_registrations
) sub WHERE payment_status IN ('captured', 'completed');
