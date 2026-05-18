-- ==============================================================================
-- TRIALS WORKFLOW: SECURE RPC TRANSITION FUNCTIONS
-- ==============================================================================
-- These functions handle workflow states securely inside PostgreSQL.
-- They utilize row-level locks (FOR UPDATE) to prevent concurrency issues and
-- strictly enforce the state machine.

-- 1. MARK CALLED
CREATE OR REPLACE FUNCTION mark_called(p_candidate_id UUID, p_level INT)
RETURNS trial_progress AS $$
DECLARE
    v_prog trial_progress%ROWTYPE;
BEGIN
    -- Lock the row for update to ensure atomic transaction
    SELECT * INTO v_prog FROM trial_progress WHERE candidate_id = p_candidate_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate progression record not found for id: %', p_candidate_id;
    END IF;

    IF p_level = 1 THEN
        UPDATE trial_progress SET l1_called = true WHERE candidate_id = p_candidate_id RETURNING * INTO v_prog;
        
    ELSIF p_level = 2 THEN
        IF v_prog.l1_result != 'SELECTED' THEN
            RAISE EXCEPTION 'Cannot access Level 2: Level 1 result is % (Expected: SELECTED)', v_prog.l1_result;
        END IF;
        UPDATE trial_progress SET l2_called = true WHERE candidate_id = p_candidate_id RETURNING * INTO v_prog;
        
    ELSIF p_level = 3 THEN
        IF v_prog.l2_result != 'SELECTED' THEN
            RAISE EXCEPTION 'Cannot access Level 3: Level 2 result is % (Expected: SELECTED)', v_prog.l2_result;
        END IF;
        UPDATE trial_progress SET l3_called = true WHERE candidate_id = p_candidate_id RETURNING * INTO v_prog;
        
    ELSE
        RAISE EXCEPTION 'Invalid level specified: %. Must be 1, 2, or 3.', p_level;
    END IF;

    RETURN v_prog;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. MARK ATTENDANCE
CREATE OR REPLACE FUNCTION mark_attendance(p_candidate_id UUID, p_level INT, p_status TEXT)
RETURNS trial_progress AS $$
DECLARE
    v_prog trial_progress%ROWTYPE;
BEGIN
    SELECT * INTO v_prog FROM trial_progress WHERE candidate_id = p_candidate_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate progression record not found for id: %', p_candidate_id;
    END IF;

    -- Validate input status
    IF p_status NOT IN ('PENDING', 'ATTENDED', 'ABSENT') THEN
        RAISE EXCEPTION 'Invalid attendance status: %. Must be PENDING, ATTENDED, or ABSENT.', p_status;
    END IF;

    IF p_level = 1 THEN
        IF v_prog.l1_called = false THEN
            RAISE EXCEPTION 'Cannot mark Level 1 attendance: Candidate has not been marked as called.';
        END IF;
        UPDATE trial_progress SET l1_attendance = p_status::trial_attendance_status WHERE candidate_id = p_candidate_id RETURNING * INTO v_prog;
        
    ELSIF p_level = 2 THEN
        IF v_prog.l1_result != 'SELECTED' THEN 
            RAISE EXCEPTION 'Cannot access Level 2: prerequisite failed.'; 
        END IF;
        IF v_prog.l2_called = false THEN 
            RAISE EXCEPTION 'Cannot mark Level 2 attendance: Candidate has not been marked as called.'; 
        END IF;
        UPDATE trial_progress SET l2_attendance = p_status::trial_attendance_status WHERE candidate_id = p_candidate_id RETURNING * INTO v_prog;
        
    ELSIF p_level = 3 THEN
        IF v_prog.l2_result != 'SELECTED' THEN 
            RAISE EXCEPTION 'Cannot access Level 3: prerequisite failed.'; 
        END IF;
        IF v_prog.l3_called = false THEN 
            RAISE EXCEPTION 'Cannot mark Level 3 attendance: Candidate has not been marked as called.'; 
        END IF;
        UPDATE trial_progress SET l3_attendance = p_status::trial_attendance_status WHERE candidate_id = p_candidate_id RETURNING * INTO v_prog;
        
    ELSE
        RAISE EXCEPTION 'Invalid level specified: %', p_level;
    END IF;

    RETURN v_prog;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. MARK RESULT
CREATE OR REPLACE FUNCTION mark_result(p_candidate_id UUID, p_level INT, p_result TEXT)
RETURNS trial_progress AS $$
DECLARE
    v_prog trial_progress%ROWTYPE;
BEGIN
    SELECT * INTO v_prog FROM trial_progress WHERE candidate_id = p_candidate_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate progression record not found for id: %', p_candidate_id;
    END IF;

    -- Validate input result
    IF p_result NOT IN ('PENDING', 'SELECTED', 'REJECTED') THEN
        RAISE EXCEPTION 'Invalid result status: %. Must be PENDING, SELECTED, or REJECTED.', p_result;
    END IF;

    IF p_level = 1 THEN
        IF v_prog.l1_attendance != 'ATTENDED' THEN 
            RAISE EXCEPTION 'Cannot mark Level 1 result: Attendance must be ATTENDED. (Current: %)', v_prog.l1_attendance; 
        END IF;
        
        UPDATE trial_progress SET 
            l1_result = p_result::trial_result_status,
            current_level = CASE WHEN p_result = 'SELECTED' THEN 2 ELSE current_level END,
            final_status = CASE WHEN p_result = 'REJECTED' THEN 'REJECTED'::trial_final_status ELSE final_status END
        WHERE candidate_id = p_candidate_id RETURNING * INTO v_prog;

    ELSIF p_level = 2 THEN
        IF v_prog.l1_result != 'SELECTED' THEN 
            RAISE EXCEPTION 'Cannot mark Level 2 result: Prerequisite failed.'; 
        END IF;
        IF v_prog.l2_attendance != 'ATTENDED' THEN 
            RAISE EXCEPTION 'Cannot mark Level 2 result: Attendance must be ATTENDED. (Current: %)', v_prog.l2_attendance; 
        END IF;
        
        UPDATE trial_progress SET 
            l2_result = p_result::trial_result_status,
            current_level = CASE WHEN p_result = 'SELECTED' THEN 3 ELSE current_level END,
            final_status = CASE WHEN p_result = 'REJECTED' THEN 'REJECTED'::trial_final_status ELSE final_status END
        WHERE candidate_id = p_candidate_id RETURNING * INTO v_prog;

    ELSIF p_level = 3 THEN
        IF v_prog.l2_result != 'SELECTED' THEN 
            RAISE EXCEPTION 'Cannot mark Level 3 result: Prerequisite failed.'; 
        END IF;
        IF v_prog.l3_attendance != 'ATTENDED' THEN 
            RAISE EXCEPTION 'Cannot mark Level 3 result: Attendance must be ATTENDED. (Current: %)', v_prog.l3_attendance; 
        END IF;
        
        UPDATE trial_progress SET 
            l3_result = p_result::trial_result_status,
            final_status = CASE WHEN p_result = 'SELECTED' THEN 'SELECTED'::trial_final_status
                                WHEN p_result = 'REJECTED' THEN 'REJECTED'::trial_final_status 
                                ELSE final_status END
        WHERE candidate_id = p_candidate_id RETURNING * INTO v_prog;
    ELSE
        RAISE EXCEPTION 'Invalid level specified: %', p_level;
    END IF;

    RETURN v_prog;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
