-- Check columns in player_registrations
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'player_registrations';
