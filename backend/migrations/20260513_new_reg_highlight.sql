-- Migration: New Registration Highlighting
-- Description: Ensures new trial candidates are marked as 'New Registration' in their progress metadata.
-- This works with the admin UI update that displays a 'NEW' badge for these records.

-- 1. Update the trigger function to include metadata
CREATE OR REPLACE FUNCTION init_trial_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize the progression state with 'is_new_registration' set to true in metadata
    INSERT INTO trial_progress(candidate_id, current_level, final_status, metadata)
    VALUES(NEW.id, 1, 'IN_PROGRESS'::trial_final_status, jsonb_build_object('is_new_registration', true));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Update existing uncalled players to be highlighted as 'New' (Optional/Backfill)
-- UPDATE trial_progress 
-- SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"is_new_registration": true}'::jsonb
-- WHERE l1_called = false;
