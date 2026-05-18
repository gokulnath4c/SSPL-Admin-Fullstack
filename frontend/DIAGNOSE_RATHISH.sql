-- Diagnose duplicates for Rathish.s
SELECT 
    pw.full_name,
    pw.phone,
    pw.workflow_id,
    ta.allocation_id,
    ta.selection_status,
    ta.created_at,
    ta.updated_at, -- if exists, otherwise assume created_at
    'trial_allocations' as table_name
FROM player_workflow pw
JOIN trial_allocations ta ON pw.workflow_id = ta.workflow_id
WHERE pw.phone = '9688563515'

UNION ALL

SELECT 
    pw.full_name,
    pw.phone,
    pw.workflow_id,
    ta.allocation_id,
    ta.selection_status,
    ta.created_at,
    ta.created_at as updated_at, -- legacy table might not have updated_at
    'trials_allocations' as table_name
FROM player_workflow pw
JOIN trials_allocations ta ON pw.workflow_id = ta.workflow_id
WHERE pw.phone = '9688563515';
