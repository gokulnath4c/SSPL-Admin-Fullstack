-- Create trial_slots table
CREATE TABLE IF NOT EXISTS trial_slots (
    slot_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    slot_name TEXT NOT NULL,
    slot_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add slot_id column to trials table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trials' AND column_name = 'slot_id') THEN
        ALTER TABLE trials ADD COLUMN slot_id UUID REFERENCES trial_slots(slot_id);
    END IF;
END $$;
