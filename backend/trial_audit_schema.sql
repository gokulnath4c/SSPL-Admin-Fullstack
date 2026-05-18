-- ==============================================================================
-- TRIALS WORKFLOW: AUDIT LOGGING (Non-Strict Validation Layer)
-- ==============================================================================
-- This schema establishes a passive audit log table.
-- It tracks every single field modification cleanly in the background
-- without enforcing brittle database-level constraints that restrict manual intervention.

-- 1. Create the Audit Log Table
CREATE TABLE IF NOT EXISTS trial_audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES trial_candidates(id),
    modified_level INT,
    old_data JSONB,
    new_data JSONB,
    changed_fields JSONB,
    action_type VARCHAR(50),  -- e.g., 'UPDATE', 'MANUAL_OVERRIDE'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for searching history fast
CREATE INDEX IF NOT EXISTS idx_trial_audit_candidate ON trial_audit_logs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_trial_audit_time ON trial_audit_logs(created_at);

-- 2. Create the Trigger Function to capture dynamic changes
CREATE OR REPLACE FUNCTION trg_audit_trial_update()
RETURNS TRIGGER AS $$
DECLARE
    changed JSONB := '{}'::jsonb;
BEGIN
    -- Level 1
    IF NEW.l1_called IS DISTINCT FROM OLD.l1_called THEN changed := jsonb_set(changed, '{l1_called}', to_jsonb(NEW.l1_called)); END IF;
    IF NEW.l1_attendance IS DISTINCT FROM OLD.l1_attendance THEN changed := jsonb_set(changed, '{l1_attendance}', to_jsonb(NEW.l1_attendance)); END IF;
    IF NEW.l1_result IS DISTINCT FROM OLD.l1_result THEN changed := jsonb_set(changed, '{l1_result}', to_jsonb(NEW.l1_result)); END IF;
    
    -- Level 2
    IF NEW.l2_called IS DISTINCT FROM OLD.l2_called THEN changed := jsonb_set(changed, '{l2_called}', to_jsonb(NEW.l2_called)); END IF;
    IF NEW.l2_attendance IS DISTINCT FROM OLD.l2_attendance THEN changed := jsonb_set(changed, '{l2_attendance}', to_jsonb(NEW.l2_attendance)); END IF;
    IF NEW.l2_result IS DISTINCT FROM OLD.l2_result THEN changed := jsonb_set(changed, '{l2_result}', to_jsonb(NEW.l2_result)); END IF;
    
    -- Level 3
    IF NEW.l3_called IS DISTINCT FROM OLD.l3_called THEN changed := jsonb_set(changed, '{l3_called}', to_jsonb(NEW.l3_called)); END IF;
    IF NEW.l3_attendance IS DISTINCT FROM OLD.l3_attendance THEN changed := jsonb_set(changed, '{l3_attendance}', to_jsonb(NEW.l3_attendance)); END IF;
    IF NEW.l3_result IS DISTINCT FROM OLD.l3_result THEN changed := jsonb_set(changed, '{l3_result}', to_jsonb(NEW.l3_result)); END IF;
    
    -- Global Status
    IF NEW.current_level IS DISTINCT FROM OLD.current_level THEN changed := jsonb_set(changed, '{current_level}', to_jsonb(NEW.current_level)); END IF;
    IF NEW.final_status IS DISTINCT FROM OLD.final_status THEN changed := jsonb_set(changed, '{final_status}', to_jsonb(NEW.final_status)); END IF;

    -- Only log if a tracked workflow field was actually altered
    IF changed != '{}'::jsonb THEN
        INSERT INTO trial_audit_logs (
            candidate_id, modified_level, old_data, new_data, changed_fields, action_type
        ) VALUES (
            NEW.candidate_id, NEW.current_level, to_jsonb(OLD), to_jsonb(NEW), changed, TG_OP
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach Audit Trigger to trial_progress
DROP TRIGGER IF EXISTS audit_trial_changes ON trial_progress;
CREATE TRIGGER audit_trial_changes
AFTER UPDATE ON trial_progress
FOR EACH ROW
EXECUTE FUNCTION trg_audit_trial_update();
