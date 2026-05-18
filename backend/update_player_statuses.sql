-- SQL script to update player trial statuses
-- 1. Update existing player 9524262728 to be qualified for all 3 levels
-- 2. Create new player Jeyaveera Pandian (9047464212) and set as qualified for all 3 levels

DO $$
DECLARE
    v_candidate_id UUID;
BEGIN
    -- 1. Update existing player 9524262728
    SELECT id INTO v_candidate_id FROM trial_candidates WHERE mobile = '9524262728' LIMIT 1;
    
    IF v_candidate_id IS NOT NULL THEN
        UPDATE trial_progress
        SET 
            l1_called = true, l1_attendance = 'ATTENDED', l1_result = 'SELECTED',
            l2_called = true, l2_attendance = 'ATTENDED', l2_result = 'SELECTED',
            l3_called = true, l3_attendance = 'ATTENDED', l3_result = 'SELECTED',
            current_level = 3,
            final_status = 'SELECTED',
            updated_at = timezone('utc'::text, now())
        WHERE candidate_id = v_candidate_id;
        RAISE NOTICE 'Updated player 9524262728 to SELECTED for all levels.';
    ELSE
        RAISE NOTICE 'Player 9524262728 not found in trial_candidates.';
    END IF;

    -- 2. Add New Player Jeyaveera Pandian - 9047464212
    -- Check if already exists
    SELECT id INTO v_candidate_id FROM trial_candidates WHERE mobile = '9047464212' LIMIT 1;
    
    IF v_candidate_id IS NULL THEN
        -- Insert candidate (trigger trg_init_trial_progress will create progress record)
        INSERT INTO trial_candidates (name, mobile, state, registration_id)
        VALUES ('Jeyaveera Pandian', '9047464212', 'chennai', gen_random_uuid())
        RETURNING id INTO v_candidate_id;
        RAISE NOTICE 'Created new candidate Jeyaveera Pandian.';
    ELSE
        RAISE NOTICE 'Candidate Jeyaveera Pandian already exists. Updating status.';
    END IF;

    -- Update progress record for the new/existing candidate to be fully qualified
    UPDATE trial_progress
    SET 
        l1_called = true, l1_attendance = 'ATTENDED', l1_result = 'SELECTED',
        l2_called = true, l2_attendance = 'ATTENDED', l2_result = 'SELECTED',
        l3_called = true, l3_attendance = 'ATTENDED', l3_result = 'SELECTED',
        current_level = 3,
        final_status = 'SELECTED',
        updated_at = timezone('utc'::text, now())
    WHERE candidate_id = v_candidate_id;
    RAISE NOTICE 'Set status to SELECTED for all levels for 9047464212.';

END $$;
