-- ✅ ADD TRIAL UID GENERATION (UPDATED for SSPL_ format)
-- This script adds the missing 'trial_uid' column and sets up auto-generation.

-- 1. Add column if not exists
ALTER TABLE public.player_workflow ADD COLUMN IF NOT EXISTS trial_uid text;

-- 2. Create/Reset Sequence (starts at 1)
-- If sequence exists, we restart it to ensure we start from SSPL_1
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'trial_uid_seq') THEN
        CREATE SEQUENCE trial_uid_seq START 1;
    ELSE
        ALTER SEQUENCE trial_uid_seq RESTART WITH 1;
    END IF;
END;
$$;

-- 3. Create Function to generate UID (Format: SSPL_1)
CREATE OR REPLACE FUNCTION generate_trial_uid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.trial_uid IS NULL THEN
        NEW.trial_uid := 'SSPL_' || nextval('trial_uid_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Trigger for FUTURE inserts
DROP TRIGGER IF EXISTS trigger_generate_trial_uid ON public.player_workflow;

CREATE TRIGGER trigger_generate_trial_uid
BEFORE INSERT ON public.player_workflow
FOR EACH ROW
EXECUTE FUNCTION generate_trial_uid();

-- 5. Backfill/Refresh ALL EXISTING records
-- Ordered by created_at so earlier registrations get lower IDs
-- We update ALL records to ensure consistent 'SSPL_' format
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Reset sequence again before backfill to be sure
    PERFORM setval('trial_uid_seq', 1, false);
    
    FOR r IN SELECT workflow_id FROM public.player_workflow ORDER BY created_at ASC
    LOOP
        UPDATE public.player_workflow
        SET trial_uid = 'SSPL_' || nextval('trial_uid_seq')
        WHERE workflow_id = r.workflow_id;
    END LOOP;
END;
$$;

-- Verification
SELECT workflow_id, trial_uid, full_name, created_at FROM public.player_workflow ORDER BY created_at DESC LIMIT 10;
