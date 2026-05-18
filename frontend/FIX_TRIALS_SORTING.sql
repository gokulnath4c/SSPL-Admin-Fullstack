-- ✅ FIX TRIALS WORKFLOW SORTING
-- Updates the created_at timestamp in player_workflow to match the registration's update time.
-- This ensures that 'recently captured' records appear at the top.

UPDATE player_workflow pw
SET created_at = COALESCE(pr.updated_at, pr.created_at)
FROM player_registrations pr
WHERE pw.registration_id = pr.id;

-- Verify the update
SELECT 
    pw.full_name, 
    pw.created_at as workflow_date, 
    COALESCE(pr.updated_at, pr.created_at) as registration_update_date
FROM player_workflow pw
JOIN player_registrations pr ON pw.registration_id = pr.id
ORDER BY pw.created_at DESC
LIMIT 10;
