-- 🔍 DIAGNOSTIC: Find the correct join column

-- Step 1: See all columns in registrations table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'registrations' 
ORDER BY ordinal_position;

-- Step 2: See first row to understand the data structure
SELECT * FROM registrations LIMIT 1;

-- Step 3: See registrations with player_registrations joined
SELECT * FROM player_registrations pr
LEFT JOIN registrations r ON pr.id::text = r.id::text
LIMIT 5;

-- Step 4: Try different join possibilities
-- Option A: Direct id match
SELECT COUNT(*) FROM registrations WHERE id IN (SELECT id FROM player_registrations LIMIT 5);

-- Option B: Look for any column containing 'player' or 'registration'
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'registrations' 
AND (column_name ILIKE '%player%' OR column_name ILIKE '%registration%' OR column_name ILIKE '%id%');

-- Step 5: Show the structure of both tables side by side
SELECT 'player_registrations' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'player_registrations'
UNION ALL
SELECT 'registrations' as table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'registrations'
ORDER BY table_name, ordinal_position;
