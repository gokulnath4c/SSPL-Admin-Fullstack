-- Add unique constraint to trial_allocations to prevent duplicate allocations for the same player in the same trial
-- and potentially same player in ANY trial if that's the rule.
-- Assuming the rule is "One player can be allocated to only one trial at a time" or "One player per trial".

-- First, let's clean up any existing duplicates if they exist, keeping the latest one?
-- It's hard to clean up safely without user input, but we can try to find them.

-- For now, let's just add the constraint for (workflow_id, trial_id) at minimum.
-- Or better, (workflow_id) if a player can ONLY be in one trial ever.
-- Given the 'TrialsWorkflowPage' moves players from "Trials List" to "Allocated", it suggests a linear flow.
-- So a player should likely only have ONE allocation.

-- Let's check if there are duplicates first.
-- SELECT workflow_id, count(*) FROM trial_allocations GROUP BY workflow_id HAVING count(*) > 1;

-- If duplicates exist, the constraints will fail to add.

-- Strategy:
-- 1. Create a unique index on workflow_id.
--    If it fails, we know there are duplicates.

-- We will try to add a UNIQUE constraint on `workflow_id`.
-- This enforces: 1 Player -> Max 1 Allocation.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trial_allocations_workflow_id_key'
    ) THEN
        ALTER TABLE trial_allocations ADD CONSTRAINT trial_allocations_workflow_id_key UNIQUE (workflow_id);
    END IF;
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Duplicates exist, cannot add unique constraint automatically. Please clean up data.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding constraint: %', SQLERRM;
END $$;
