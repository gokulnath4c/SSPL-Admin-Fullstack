-- ✅ AUTO-MOVE CAPTURED REGISTRATIONS TO TRIALS WORKFLOW

-- 1. Backfill: Move all existing 'captured' registrations to player_workflow
INSERT INTO player_workflow (
    registration_id,
    workflow_stage,
    full_name,
    email,
    phone,
    state,
    city,
    pincode,
    payment_status,
    payment_amount,
    created_at,
    updated_at
)
SELECT 
    pr.id,
    'registration_completed', -- Target stage for Trials List
    pr.full_name,
    pr.email,
    pr.phone,
    pr.state,
    pr.city,
    pr.pincode,
    pr.payment_status,
    pr.payment_amount,
    NOW(),
    NOW()
FROM player_registrations pr
WHERE pr.payment_status = 'captured'
  AND NOT EXISTS (
      SELECT 1 FROM player_workflow pw 
      WHERE pw.registration_id = pr.id
  );

-- 2. Create Trigger Function to handle future updates/inserts
CREATE OR REPLACE FUNCTION public.handle_new_captured_registration()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if payment_status is 'captured'
    IF NEW.payment_status = 'captured' THEN
        -- Check if already exists in workflow to avoid duplicates
        IF NOT EXISTS (SELECT 1 FROM public.player_workflow WHERE registration_id = NEW.id) THEN
            INSERT INTO public.player_workflow (
                registration_id,
                workflow_stage,
                full_name,
                email,
                phone,
                state,
                city,
                pincode,
                payment_status,
                payment_amount,
                created_at,
                updated_at
            ) VALUES (
                NEW.id,
                'registration_completed',
                NEW.full_name,
                NEW.email,
                NEW.phone,
                NEW.state,
                NEW.city,
                NEW.pincode,
                NEW.payment_status,
                NEW.payment_amount,
                NOW(),
                NOW()
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the Trigger
DROP TRIGGER IF EXISTS on_registration_captured ON public.player_registrations;

CREATE TRIGGER on_registration_captured
AFTER INSERT OR UPDATE ON public.player_registrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_captured_registration();

-- Verification
SELECT 
    (SELECT COUNT(*) FROM player_registrations WHERE payment_status = 'captured') as total_captured_registrations,
    (SELECT COUNT(*) FROM player_workflow) as total_in_workflow;
