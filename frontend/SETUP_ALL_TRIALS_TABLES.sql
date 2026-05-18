-- Consolidated Setup Script for Trials Workflow Tables

-- 1. Create trials_centers table
CREATE TABLE IF NOT EXISTS trials_centers (
    center_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    center_name TEXT NOT NULL,
    center_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create trial_slots table
CREATE TABLE IF NOT EXISTS trial_slots (
    slot_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slot_name TEXT NOT NULL,
    slot_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Link tables to 'trials' table
DO $$
BEGIN
    -- Add center_id to trials
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trials' AND column_name = 'center_id') THEN
        ALTER TABLE trials ADD COLUMN center_id UUID REFERENCES trials_centers(center_id);
    END IF;

    -- Add slot_id to trials
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trials' AND column_name = 'slot_id') THEN
        ALTER TABLE trials ADD COLUMN slot_id UUID REFERENCES trial_slots(slot_id);
    END IF;
END $$;

-- 4. Grant Permissions (Crucial for Supabase API access)
ALTER TABLE trials_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_slots ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access (Adjust as per security requirements)
-- For now, allowing full access to authenticated users for admin purposes
CREATE POLICY "Enable all access for authenticated users on trials_centers" ON "public"."trials_centers"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable read access for all users on trials_centers" ON "public"."trials_centers"
AS PERMISSIVE FOR SELECT
TO anon
USING (true);

CREATE POLICY "Enable all access for authenticated users on trial_slots" ON "public"."trial_slots"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable read access for all users on trial_slots" ON "public"."trial_slots"
AS PERMISSIVE FOR SELECT
TO anon
USING (true);

-- Explicit grants to roles
GRANT ALL ON TABLE trials_centers TO postgres, service_role;
GRANT ALL ON TABLE trials_centers TO authenticated;
GRANT SELECT ON TABLE trials_centers TO anon;

GRANT ALL ON TABLE trial_slots TO postgres, service_role;
GRANT ALL ON TABLE trial_slots TO authenticated;
GRANT SELECT ON TABLE trial_slots TO anon;

-- Force schema cache reload (This is a comment instruction, usually not a SQL command in standard Postgres, but Supabase has a button for it)
NOTIFY pgrst, 'reload config';
