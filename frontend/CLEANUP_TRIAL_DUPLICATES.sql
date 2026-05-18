-- ⚠️ WARNING: This script deletes data. Run a backup first if possible.

-- 1. Create a temporary table to store IDs to delete
-- This solves the issue of CTEs not being visible across multiple DELETE statements
CREATE TEMP TABLE TempToDelete AS
WITH RankedAllocations AS (
    SELECT 
        pw.workflow_id,
        pw.phone,
        ta.selection_status,
        -- Use evaluated_at, fallback to created_at
        COALESCE(ta.evaluated_at, ta.created_at) as last_activity,
        CASE 
            WHEN ta.selection_status = 'selected' THEN 1
            WHEN ta.selection_status = 'waitlisted' THEN 2
            WHEN ta.selection_status = 'pending' THEN 3
            ELSE 4 
        END as status_rank,
        -- Rank within each phone number
        ROW_NUMBER() OVER (
            PARTITION BY pw.phone 
            ORDER BY 
                CASE 
                    WHEN ta.selection_status = 'selected' THEN 1
                    WHEN ta.selection_status = 'waitlisted' THEN 2
                    WHEN ta.selection_status = 'pending' THEN 3
                    ELSE 4 
                END ASC,
                COALESCE(ta.evaluated_at, ta.created_at) DESC
        ) as rn
    FROM player_workflow pw
    LEFT JOIN trial_allocations ta ON pw.workflow_id = ta.workflow_id
    WHERE pw.phone IN (
        -- Only look at phones that appear more than once in the workflow
        SELECT phone 
        FROM player_workflow 
        GROUP BY phone 
        HAVING COUNT(*) > 1
    )
)
SELECT workflow_id 
FROM RankedAllocations 
WHERE rn > 1;

-- 2. Execute Deletion
-- Delete from child table first
DELETE FROM trial_allocations
WHERE workflow_id IN (SELECT workflow_id FROM TempToDelete);

-- Delete from parent table
DELETE FROM player_workflow
WHERE workflow_id IN (SELECT workflow_id FROM TempToDelete);

-- 3. Also check for duplicates within trial_allocations for the SAME workflow_id
-- We can do this in a single statement without a temp table since it's just one table
WITH RankedSameWorkflow AS (
    SELECT 
        allocation_id,
        workflow_id,
        ROW_NUMBER() OVER (
            PARTITION BY workflow_id 
            ORDER BY evaluated_at DESC, created_at DESC
        ) as rn
    FROM trial_allocations
)
DELETE FROM trial_allocations
WHERE allocation_id IN (
    SELECT allocation_id 
    FROM RankedSameWorkflow 
    WHERE rn > 1
);

-- 4. Clean up
DROP TABLE TempToDelete;

SELECT 'Cleanup Completed' as status;
