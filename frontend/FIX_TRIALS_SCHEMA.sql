
-- ⚠️ WARNING: This script will RESET the trials workflow tables.
-- This is necessary because the existing tables do not match the required schema (missing workflow_id).
-- Actual player registrations (names, emails, payments) in 'player_registrations' will NOT be deleted.
-- only the tracking of their trial status will be reset.

-- 1. Drop existing tables that might have incorrect schemas
DROP TABLE IF EXISTS public.trial_allocations CASCADE;
DROP TABLE IF EXISTS public.trials_allocations CASCADE; -- generic/legacy one
DROP TABLE IF EXISTS public.trials CASCADE;
DROP TABLE IF EXISTS public.player_workflow CASCADE;

-- 2. Re-create player_workflow with the correct schema
CREATE TABLE public.player_workflow (
    workflow_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    registration_id uuid NOT NULL REFERENCES public.player_registrations(id), -- Logical link to play_registrations(id)
    workflow_stage text NOT NULL, -- 'registration_pending', 'registration_completed', 'trials_section', 'trials_allocated'
    full_name text,
    email text,
    phone text,
    state text,
    city text,
    pincode text,
    payment_status text,
    payment_amount numeric,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    moved_to_trials_at timestamp with time zone,
    allocated_to_trials_at timestamp with time zone,
    
    -- Email tracking
    confirmation_email_sent boolean DEFAULT false,
    confirmation_email_sent_at timestamp with time zone,
    confirmation_email_log_id uuid
);

-- Enable RLS
ALTER TABLE public.player_workflow ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.player_workflow FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.player_workflow FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.player_workflow FOR UPDATE USING (true);


-- 3. Re-create trials table
CREATE TABLE public.trials (
    trial_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trial_name text NOT NULL,
    trial_date date NOT NULL,
    trial_time time without time zone,
    trial_venue text NOT NULL,
    trial_address text,
    trial_batch text,
    trial_capacity integer DEFAULT 50,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.trials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.trials FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.trials FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.trials FOR UPDATE USING (true);


-- 4. Re-create trial_allocations table (linked to specific trial)
CREATE TABLE public.trial_allocations (
    allocation_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trial_id uuid REFERENCES public.trials(trial_id),
    workflow_id uuid REFERENCES public.player_workflow(workflow_id),
    allocation_date timestamp with time zone,
    attendance_status text DEFAULT 'pending', -- 'pending', 'attended', 'absent'
    attended_at timestamp with time zone,
    
    -- Scores
    batting_score numeric,
    bowling_score numeric,
    fielding_score numeric,
    overall_score numeric,
    selection_status text DEFAULT 'pending', -- 'pending', 'selected', 'not_selected', 'waitlisted'
    remarks text,
    evaluator_notes text,
    evaluated_at timestamp with time zone,

    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.trial_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.trial_allocations FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.trial_allocations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.trial_allocations FOR UPDATE USING (true);


-- 5. Re-create trials_allocations table (legacy/generic allocations support)
-- This table seems to be used as a fallback or for different flow in the code
CREATE TABLE public.trials_allocations (
    allocation_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id uuid REFERENCES public.player_workflow(workflow_id),
    allocation_date date,
    allocation_time text,
    allocation_venue text,
    allocation_batch text,
    attendance_status text DEFAULT 'pending',
    attended_at timestamp with time zone,
    
    -- Scores
    batting_score numeric,
    bowling_score numeric,
    fielding_score numeric,
    overall_score numeric,
    selection_status text DEFAULT 'pending',
    remarks text,
    evaluator_notes text,
    evaluated_at timestamp with time zone,

    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.trials_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.trials_allocations FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.trials_allocations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.trials_allocations FOR UPDATE USING (true);

