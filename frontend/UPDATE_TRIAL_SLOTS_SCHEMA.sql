-- Add end_time column to trial_slots
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trial_slots' AND column_name = 'slot_end_time') THEN
        ALTER TABLE trial_slots ADD COLUMN slot_end_time TIME;
    END IF;
    
    -- Rename slot_time to slot_start_time for clarity if needed, or just keep slot_time as start
    -- Let's keep slot_time as start time to avoid breaking existing queries immediately, 
    -- but conceptually treat it as start time.
    -- Ideally, we should rename standardizing names:
    -- ALTER TABLE trial_slots RENAME COLUMN slot_time TO slot_start_time;
    -- However, this would break existing API code. 
    -- Let's just add slot_end_time and leave slot_time as the start time for now.
    -- Or, better, let's treat 'slot_time' as 'From' and add 'slot_end_time' as 'To'.
END $$;
