-- Verify Duplicates are Gone

-- 1. Check for Rathish.s
SELECT 
    pw.full_name,
    pw.phone,
    ta.selection_status,
    ta.created_at
FROM player_workflow pw
LEFT JOIN trial_allocations ta ON pw.workflow_id = ta.workflow_id
WHERE pw.phone = '9688563515';

-- 2. Check for any remaining duplicates by phone
SELECT phone, COUNT(*) 
FROM player_workflow
GROUP BY phone
HAVING COUNT(*) > 1;

-- 3. Check for any remaining duplicates in allocations for same workflow
SELECT workflow_id, COUNT(*)
FROM trial_allocations
GROUP BY workflow_id
HAVING COUNT(*) > 1;
