-- Migration: Update Trials Schema with Centers and Slots
-- Description: Adds center_id, slot_id, and google_map_link to trials table. Creates trials_centers and trial_slots tables.

-- 1. Create trial_centers table if not exists
CREATE TABLE IF NOT EXISTS public.trials_centers (
    center_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    center_name text NOT NULL,
    center_address text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for trials_centers
ALTER TABLE public.trials_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.trials_centers FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.trials_centers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.trials_centers FOR UPDATE USING (true);


-- 2. Create trial_slots table if not exists
CREATE TABLE IF NOT EXISTS public.trial_slots (
    slot_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slot_name text NOT NULL,
    slot_time time without time zone NOT NULL, 
    slot_end_time time without time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for trial_slots
ALTER TABLE public.trial_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.trial_slots FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.trial_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.trial_slots FOR UPDATE USING (true);


-- 3. Add columns to trials table
ALTER TABLE public.trials ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.trials_centers(center_id);
ALTER TABLE public.trials ADD COLUMN IF NOT EXISTS slot_id uuid REFERENCES public.trial_slots(slot_id);
ALTER TABLE public.trials ADD COLUMN IF NOT EXISTS google_map_link text;

-- 4. Enable RLS policies updates (idempotent)
ALTER TABLE public.trials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.trials;
CREATE POLICY "Enable read access for all users" ON public.trials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON public.trials;
CREATE POLICY "Enable insert for all users" ON public.trials FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON public.trials;
CREATE POLICY "Enable update for all users" ON public.trials FOR UPDATE USING (true);
