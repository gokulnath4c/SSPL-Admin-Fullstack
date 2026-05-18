
-- Final step: Create the foreign key relationship
-- This is required for the application to fetch player details (name, email)
-- when displaying the workflow lists.

ALTER TABLE public.player_workflow
ADD CONSTRAINT fk_player_workflow_registration
FOREIGN KEY (registration_id)
REFERENCES public.player_registrations(id)
ON DELETE CASCADE;
