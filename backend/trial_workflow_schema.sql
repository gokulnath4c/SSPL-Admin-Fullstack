-- Clean up existing tables/views if re-running or migrating from previous drafts
DROP VIEW IF EXISTS trial_view;
DROP TABLE IF EXISTS trial_progress CASCADE;
DROP TABLE IF EXISTS trial_candidates CASCADE;

-- 1. Create Enums for Trial Workflow Statuses
DO $$ BEGIN
    CREATE TYPE trial_attendance_status AS ENUM ('PENDING', 'ATTENDED', 'ABSENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trial_result_status AS ENUM ('PENDING', 'SELECTED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trial_final_status AS ENUM ('IN_PROGRESS', 'SELECTED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create trial_candidates table
CREATE TABLE IF NOT EXISTS trial_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    registration_id UUID,
    name VARCHAR(255),
    mobile VARCHAR(20),
    email VARCHAR(255),
    state VARCHAR(100),
    proficiency VARCHAR(100),
    payment_status VARCHAR(50),
    payment_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create trial_progress table
CREATE TABLE IF NOT EXISTS trial_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES trial_candidates(id) ON DELETE CASCADE,
    current_level INT DEFAULT 1,
    
    -- Level 1
    l1_called BOOLEAN DEFAULT false,
    l1_attendance trial_attendance_status DEFAULT 'PENDING'::trial_attendance_status,
    l1_result trial_result_status DEFAULT 'PENDING'::trial_result_status,
    
    -- Level 2
    l2_called BOOLEAN DEFAULT false,
    l2_attendance trial_attendance_status DEFAULT 'PENDING'::trial_attendance_status,
    l2_result trial_result_status DEFAULT 'PENDING'::trial_result_status,
    
    -- Level 3
    l3_called BOOLEAN DEFAULT false,
    l3_attendance trial_attendance_status DEFAULT 'PENDING'::trial_attendance_status,
    l3_result trial_result_status DEFAULT 'PENDING'::trial_result_status,
    
    -- Final Status
    final_status trial_final_status DEFAULT 'IN_PROGRESS'::trial_final_status,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create Indexes
-- Candidate Reference Index
CREATE INDEX IF NOT EXISTS idx_trial_progress_candidate_id ON trial_progress(candidate_id);

-- Call Status Indexes
CREATE INDEX IF NOT EXISTS idx_trial_l1_called ON trial_progress(l1_called);
CREATE INDEX IF NOT EXISTS idx_trial_l2_called ON trial_progress(l2_called);
CREATE INDEX IF NOT EXISTS idx_trial_l3_called ON trial_progress(l3_called);

-- Attendance Indexes
CREATE INDEX IF NOT EXISTS idx_trial_l1_attendance ON trial_progress(l1_attendance);
CREATE INDEX IF NOT EXISTS idx_trial_l2_attendance ON trial_progress(l2_attendance);
CREATE INDEX IF NOT EXISTS idx_trial_l3_attendance ON trial_progress(l3_attendance);

-- Result Indexes
CREATE INDEX IF NOT EXISTS idx_trial_l1_result ON trial_progress(l1_result);
CREATE INDEX IF NOT EXISTS idx_trial_l2_result ON trial_progress(l2_result);
CREATE INDEX IF NOT EXISTS idx_trial_l3_result ON trial_progress(l3_result);

-- Final Status Index
CREATE INDEX IF NOT EXISTS idx_trial_final_status ON trial_progress(final_status);

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION set_trial_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_trial_progress_updated_at ON trial_progress;
CREATE TRIGGER trg_set_trial_progress_updated_at
BEFORE UPDATE ON trial_progress
FOR EACH ROW
EXECUTE FUNCTION set_trial_progress_updated_at();

-- 6. Create trial_view
CREATE OR REPLACE VIEW trial_view AS
SELECT 
    tc.id AS candidate_id,
    tc.user_id,
    tc.registration_id,
    tc.name,
    tc.mobile,
    tc.email,
    tc.state,
    tc.proficiency,
    tc.payment_status,
    tc.payment_id,
    tc.status AS candidate_base_status,
    tc.imported_at,
    
    tp.id AS progress_id,
    tp.current_level,
    
    tp.l1_called,
    tp.l1_attendance,
    tp.l1_result,
    
    tp.l2_called,
    tp.l2_attendance,
    tp.l2_result,
    
    tp.l3_called,
    tp.l3_attendance,
    tp.l3_result,
    
    tp.final_status,
    tp.metadata,
    tp.updated_at
FROM trial_candidates tc
JOIN trial_progress tp ON tc.id = tp.candidate_id;
