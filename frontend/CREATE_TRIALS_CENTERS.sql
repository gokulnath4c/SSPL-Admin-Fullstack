-- Create trials_centers table
CREATE TABLE IF NOT EXISTS trials_centers (
    center_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    center_name TEXT NOT NULL,
    center_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add center_id column to trials table to link trials to centers
-- Using DO block to check if column exists before adding to avoid errors in repeated runs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trials' AND column_name = 'center_id') THEN
        ALTER TABLE trials ADD COLUMN center_id UUID REFERENCES trials_centers(center_id);
    END IF;
END $$;
