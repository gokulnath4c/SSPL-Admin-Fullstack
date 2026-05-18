-- Fixed script for Rathish.s (9688563515)
-- Keeps "Selected" record, removes "Not Selected"

-- 1. Get all workflow IDs for this phone number
CREATE TEMP TABLE RathishWorkflows AS
SELECT workflow_id 
FROM player_workflow 
WHERE phone = '9688563515';

-- 2. Identify the "Best" record to KEEP
-- We look at both tables to find the 'selected' one
CREATE TEMP TABLE WorkflowToKeep AS
SELECT pw.workflow_id
FROM player_workflow pw
LEFT JOIN trial_allocations ta ON pw.workflow_id = ta.workflow_id
LEFT JOIN trials_allocations ta_legacy ON pw.workflow_id = ta_legacy.workflow_id
WHERE pw.phone = '9688563515'
ORDER BY 
    CASE 
        WHEN ta.selection_status = 'selected' OR ta_legacy.selection_status = 'selected' THEN 1
        WHEN ta.selection_status = 'waitlisted' OR ta_legacy.selection_status = 'waitlisted' THEN 2
        ELSE 3 
    END ASC,
    COALESCE(ta.evaluated_at, ta.created_at, ta_legacy.evaluated_at, ta_legacy.created_at) DESC
LIMIT 1;

-- 3. Delete duplicates from Child Tables (allocations)
DELETE FROM trial_allocations
WHERE workflow_id IN (SELECT workflow_id FROM RathishWorkflows)
AND workflow_id NOT IN (SELECT workflow_id FROM WorkflowToKeep);

DELETE FROM trials_allocations
WHERE workflow_id IN (SELECT workflow_id FROM RathishWorkflows)
AND workflow_id NOT IN (SELECT workflow_id FROM WorkflowToKeep);

-- 4. Delete duplicates from Parent Table (workflow)
DELETE FROM player_workflow
WHERE workflow_id IN (SELECT workflow_id FROM RathishWorkflows)
AND workflow_id NOT IN (SELECT workflow_id FROM WorkflowToKeep);

-- 5. Handle case where SAME workflow_id has multiple allocations (rare but possible)
DELETE FROM trial_allocations
WHERE workflow_id IN (SELECT workflow_id FROM WorkflowToKeep)
AND selection_status != 'selected';

DELETE FROM trials_allocations
WHERE workflow_id IN (SELECT workflow_id FROM WorkflowToKeep)
AND selection_status != 'selected';

-- Clean up
DROP TABLE RathishWorkflows;
DROP TABLE WorkflowToKeep;

SELECT 'Fixed Rathish.s' as status;
