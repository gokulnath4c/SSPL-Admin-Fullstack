-- Fix duplicate trial results for mobile 9688563515
-- Issue: Both "selected" and "not selected" status exist
-- Solution: Keep only "selected" status

-- Step 1: First, let's see the current state of records
SELECT 
    pw.workflow_id,
    pw.player_name,
    pw.phone,
    ta.selection_status AS ta_status,
    ta.created_at AS ta_created,
    tal.selection_status AS tal_status,
    tal.created_at AS tal_created
FROM player_workflow pw
LEFT JOIN trial_allocations ta ON pw.workflow_id = ta.workflow_id
LEFT JOIN trials_allocations tal ON pw.workflow_id = tal.workflow_id
WHERE pw.phone = '9688563515';

-- Step 2: Delete "not selected" records from trial_allocations (new table)
DELETE FROM trial_allocations
WHERE workflow_id IN (
    SELECT workflow_id 
    FROM player_workflow 
    WHERE phone = '9688563515'
)
AND LOWER(selection_status) = 'not selected';

-- Step 3: Delete "not selected" records from trials_allocations (legacy table)
DELETE FROM trials_allocations
WHERE workflow_id IN (
    SELECT workflow_id 
    FROM player_workflow 
    WHERE phone = '9688563515'
)
AND LOWER(selection_status) = 'not selected';

-- Step 4: Also check and clean player_workflow duplicates (keep only the one with selected status)
-- First, identify if there are multiple workflow entries for this phone
WITH RankedWorkflows AS (
    SELECT 
        pw.workflow_id,
        pw.phone,
        COALESCE(ta.selection_status, tal.selection_status) as status,
        ROW_NUMBER() OVER (
            PARTITION BY pw.phone 
            ORDER BY 
                CASE WHEN LOWER(COALESCE(ta.selection_status, tal.selection_status)) = 'selected' THEN 1 ELSE 2 END,
                GREATEST(COALESCE(ta.created_at, '1970-01-01'), COALESCE(tal.created_at, '1970-01-01')) DESC
        ) as rn
    FROM player_workflow pw
    LEFT JOIN trial_allocations ta ON pw.workflow_id = ta.workflow_id
    LEFT JOIN trials_allocations tal ON pw.workflow_id = tal.workflow_id
    WHERE pw.phone = '9688563515'
)
SELECT * FROM RankedWorkflows;

-- Step 5: Delete duplicate workflow entries (keep the "selected" one)
-- First delete from child tables
DELETE FROM trial_allocations
WHERE workflow_id IN (
    SELECT workflow_id FROM (
        WITH RankedWorkflows AS (
            SELECT 
                pw.workflow_id,
                ROW_NUMBER() OVER (
                    PARTITION BY pw.phone 
                    ORDER BY 
                        CASE WHEN LOWER(COALESCE(ta.selection_status, tal.selection_status)) = 'selected' THEN 1 ELSE 2 END,
                        GREATEST(COALESCE(ta.created_at, '1970-01-01'::timestamp), COALESCE(tal.created_at, '1970-01-01'::timestamp)) DESC
                ) as rn
            FROM player_workflow pw
            LEFT JOIN trial_allocations ta ON pw.workflow_id = ta.workflow_id
            LEFT JOIN trials_allocations tal ON pw.workflow_id = tal.workflow_id
            WHERE pw.phone = '9688563515'
        )
        SELECT workflow_id FROM RankedWorkflows WHERE rn > 1
    ) AS duplicates
);

DELETE FROM trials_allocations
WHERE workflow_id IN (
    SELECT workflow_id FROM (
        WITH RankedWorkflows AS (
            SELECT 
                pw.workflow_id,
                ROW_NUMBER() OVER (
                    PARTITION BY pw.phone 
                    ORDER BY 
                        CASE WHEN LOWER(COALESCE(ta.selection_status, tal.selection_status)) = 'selected' THEN 1 ELSE 2 END,
                        GREATEST(COALESCE(ta.created_at, '1970-01-01'::timestamp), COALESCE(tal.created_at, '1970-01-01'::timestamp)) DESC
                ) as rn
            FROM player_workflow pw
            LEFT JOIN trial_allocations ta ON pw.workflow_id = ta.workflow_id
            LEFT JOIN trials_allocations tal ON pw.workflow_id = tal.workflow_id
            WHERE pw.phone = '9688563515'
        )
        SELECT workflow_id FROM RankedWorkflows WHERE rn > 1
    ) AS duplicates
);

-- Then delete from parent table
DELETE FROM player_workflow
WHERE workflow_id IN (
    SELECT workflow_id FROM (
        WITH RankedWorkflows AS (
            SELECT 
                pw.workflow_id,
                ROW_NUMBER() OVER (
                    PARTITION BY pw.phone 
                    ORDER BY 
                        CASE WHEN LOWER(COALESCE(ta.selection_status, tal.selection_status)) = 'selected' THEN 1 ELSE 2 END,
                        GREATEST(COALESCE(ta.created_at, '1970-01-01'::timestamp), COALESCE(tal.created_at, '1970-01-01'::timestamp)) DESC
                ) as rn
            FROM player_workflow pw
            LEFT JOIN trial_allocations ta ON pw.workflow_id = ta.workflow_id
            LEFT JOIN trials_allocations tal ON pw.workflow_id = tal.workflow_id
            WHERE pw.phone = '9688563515'
        )
        SELECT workflow_id FROM RankedWorkflows WHERE rn > 1
    ) AS duplicates
);

-- Step 6: Verify the fix - should show only one record with "selected" status
SELECT 
    pw.workflow_id,
    pw.player_name,
    pw.phone,
    COALESCE(ta.selection_status, tal.selection_status) AS selection_status,
    COALESCE(ta.created_at, tal.created_at) AS allocation_date
FROM player_workflow pw
LEFT JOIN trial_allocations ta ON pw.workflow_id = ta.workflow_id
LEFT JOIN trials_allocations tal ON pw.workflow_id = tal.workflow_id
WHERE pw.phone = '9688563515';
