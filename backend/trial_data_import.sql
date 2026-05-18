-- ==============================================================================
-- TRIALS WORKFLOW: DATA IMPORT & VALIDATION SCRIPT
-- ==============================================================================

-- 1. ADD UNIQUE CONSTRAINT (Required for ON CONFLICT DO NOTHING)
-- Prevents the same registration_id from being inserted twice.
ALTER TABLE trial_candidates
ADD CONSTRAINT uq_trial_candidates_registration UNIQUE(registration_id);


-- 2. AUTO-INITIALIZE PROGRESS (Highly Recommended)
-- Ensures that bulk-importing candidates will automatically create their 
-- corresponding trial_progress row so they show up in the workflow instantly.
CREATE OR REPLACE FUNCTION init_trial_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize the progression state referencing the new candidate
    INSERT INTO trial_progress(candidate_id, current_level, final_status)
    VALUES(NEW.id, 1, 'IN_PROGRESS'::trial_final_status);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_init_trial_progress ON trial_candidates;
CREATE TRIGGER trg_init_trial_progress
AFTER INSERT ON trial_candidates
FOR EACH ROW
EXECUTE FUNCTION init_trial_progress();


-- 3. THE INCREMENTAL IMPORT SCRIPT
-- Run this block periodically or inside a cron job. 
-- ON CONFLICT DO NOTHING guarantees only newer records get appended.
-- Modify the "FROM" JOINs depending on your precise source table names.

INSERT INTO trial_candidates (
    user_id,             -- Replace with appropriate source column if available
    registration_id,
    name,
    phone,
    email,
    city,
    payment_status,
    payment_id,
    imported_at
)
SELECT 
    pw.workflow_id AS user_id,          -- Or use the specific user_id if separated 
    pw.workflow_id AS registration_id,
    pw.full_name AS name,
    pw.phone,
    pw.email,
    pw.city,
    'CAPTURED' AS payment_status,
    rl.payment_id,                      -- Sourced from the ledger
    timezone('utc'::text, now()) AS imported_at
FROM 
    player_workflow pw                  -- Your read-only source of truth
LEFT JOIN 
    razorpay_ledger rl ON rl.contact = pw.phone OR rl.email = pw.email
WHERE 
    LOWER(pw.payment_status) IN ('captured', 'success')
ON CONFLICT (registration_id) DO NOTHING;


-- ==============================================================================
-- 4. VALIDATION QUERIES
-- ==============================================================================

-- Query A: Total valid Captured records in the Source layer
SELECT COUNT(*) AS total_source_eligible
FROM player_workflow
WHERE LOWER(payment_status) IN ('captured', 'success');

-- Query B: Total candidate records safely imported into the Workflow layer
SELECT COUNT(*) AS total_imported_candidates
FROM trial_candidates;

-- Query C: Confirm trial_progress aligned with candidates (should exact match B)
SELECT COUNT(*) AS total_initialized_progress
FROM trial_progress;

-- Query D: Deep audit - Show missing/unmigrated candidates explicitly
SELECT 
    pw.workflow_id, 
    pw.full_name, 
    pw.phone 
FROM player_workflow pw
WHERE LOWER(pw.payment_status) IN ('captured', 'success')
AND NOT EXISTS (
    SELECT 1 FROM trial_candidates tc WHERE tc.registration_id = pw.workflow_id
);
