-- Run this in your Supabase SQL Editor
-- This adds tracking columns for Level 1, Level 2, and Level 3 trials to the player_workflow table.

ALTER TABLE player_workflow 
ADD COLUMN IF NOT EXISTS level_1_status VARCHAR DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS level_2_status VARCHAR DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS level_3_status VARCHAR DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS level_1_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS level_2_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS level_3_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS level_1_remarks TEXT,
ADD COLUMN IF NOT EXISTS level_2_remarks TEXT,
ADD COLUMN IF NOT EXISTS level_3_remarks TEXT;

-- Drop NOT NULL constraint on position (if exists) via updating constraint or column
DO $$
BEGIN
  BEGIN
    ALTER TABLE player_registrations ALTER COLUMN position DROP NOT NULL;
  EXCEPTION
    WHEN others THEN NULL; -- Ignore if column does not exist or relation is views
  END;
END $$;

-- Drop NOT NULL constraint on player_position in registrations (just in case they both exist)
DO $$
BEGIN
  BEGIN
    ALTER TABLE registrations ALTER COLUMN player_position DROP NOT NULL;
  EXCEPTION
    WHEN others THEN NULL;
  END;
END $$;

-- Update player_workflow to handle Re-Registration
ALTER TABLE player_workflow
ADD COLUMN IF NOT EXISTS re_registration_eligible BOOLEAN DEFAULT false;
