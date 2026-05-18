-- Check the actual columns in your registrations table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'registrations' 
ORDER BY ordinal_position;

-- Also check what columns exist in player_registrations
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'player_registrations' 
ORDER BY ordinal_position;

-- View actual data to understand structure
SELECT * FROM registrations LIMIT 5;
SELECT * FROM player_registrations LIMIT 5;
