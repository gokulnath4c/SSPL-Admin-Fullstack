-- ⚠️ WARNING: Review before running!

-- 1. View records to be deleted (Dry Run)
SELECT * FROM player_registrations 
WHERE email = 'gokulnath.4c@gmail.com'
   OR phone IN ('9150247561', '9003677496', '+919150247561', '+919003677496')
   OR pincode = '600041'; -- ⚠️ Careful with pincode, it might match other users!

-- 2. Delete specific records (Recommended: Delete by Email/Phone only)
DELETE FROM player_registrations 
WHERE email = 'gokulnath.4c@gmail.com'
   OR phone IN ('9150247561', '9003677496', '+919150247561', '+919003677496');

-- 3. Delete by Pincode (ONLY run if you are sure you want to delete everyone in this area)
-- DELETE FROM player_registrations WHERE pincode = '600041';
