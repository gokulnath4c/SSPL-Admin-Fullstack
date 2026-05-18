-- 🔄 REAL DATA INSERTION GUIDE
-- Replace all the sample data with your actual player information

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: CLEAR OLD TEST DATA (Optional - only if you want to start fresh)
-- ═══════════════════════════════════════════════════════════════════════════

-- Uncomment and run these if you want to delete all test data:
-- DELETE FROM payments;
-- DELETE FROM registrations;
-- DELETE FROM players;
-- DELETE FROM trials;


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: INSERT YOUR TRIAL INFORMATION
-- ═══════════════════════════════════════════════════════════════════════════
-- Replace 'Your Trial 1', 'Your Trial 2', etc. with your actual trial names

INSERT INTO trials (name, description) VALUES
  ('Your Trial 1', 'Description of trial 1'),
  ('Your Trial 2', 'Description of trial 2'),
  ('Your Trial 3', 'Description of trial 3')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: INSERT YOUR PLAYER DATA
-- ═══════════════════════════════════════════════════════════════════════════
-- Replace with your actual player names, emails, and phone numbers
-- Example format:
--   ('John Smith', 'john.smith@company.com', '+1-555-123-4567')

INSERT INTO players (name, email, phone) VALUES
  ('Player Name 1', 'player1@company.com', '+1-555-123-4501'),
  ('Player Name 2', 'player2@company.com', '+1-555-123-4502'),
  ('Player Name 3', 'player3@company.com', '+1-555-123-4503'),
  ('Player Name 4', 'player4@company.com', '+1-555-123-4504'),
  ('Player Name 5', 'player5@company.com', '+1-555-123-4505')
ON CONFLICT (email) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: INSERT REGISTRATIONS
-- ═══════════════════════════════════════════════════════════════════════════
-- Update with your players, trials, states, and statuses
-- Status options: 'pending', 'approved', 'rejected'
-- State: 2-letter US state code (CA, TX, NY, FL, etc.)

INSERT INTO registrations (player_id, trial_id, state, status, notes) 
SELECT p.id, t.id, s.state, s.status, s.notes
FROM (VALUES
  ('player1@company.com', 'Your Trial 1', 'CA', 'approved', 'Verified'),
  ('player2@company.com', 'Your Trial 2', 'TX', 'pending', 'Awaiting approval'),
  ('player3@company.com', 'Your Trial 1', 'NY', 'approved', 'Active'),
  ('player4@company.com', 'Your Trial 3', 'FL', 'pending', 'Under review'),
  ('player5@company.com', 'Your Trial 2', 'CA', 'approved', 'Verified')
) AS s(email, trial_name, state, status, notes)
JOIN players p ON p.email = s.email
JOIN trials t ON t.name = s.trial_name
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: INSERT PAYMENT DATA
-- ═══════════════════════════════════════════════════════════════════════════
-- Update amounts, statuses, and dates as needed
-- Status options: 'pending', 'completed', 'failed'

INSERT INTO payments (registration_id, amount, status, payment_date)
SELECT 
  r.id,
  500.00,  -- Update with actual payment amount
  CASE WHEN r.status = 'pending' THEN 'pending' ELSE 'completed' END,
  CASE WHEN r.status = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP END
FROM registrations r
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION: Check your data was inserted
-- ═══════════════════════════════════════════════════════════════════════════

SELECT * FROM get_player_registrations();

-- Should show your real players with all their registration and payment info!


-- ═══════════════════════════════════════════════════════════════════════════
-- ADDITIONAL QUERIES FOR MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════

-- View all players
-- SELECT * FROM players;

-- View all trials
-- SELECT * FROM trials;

-- View all registrations with details
-- SELECT 
--   p.name as player,
--   t.name as trial,
--   r.state,
--   r.status,
--   pay.amount,
--   pay.status as payment_status
-- FROM registrations r
-- JOIN players p ON r.player_id = p.id
-- JOIN trials t ON r.trial_id = t.id
-- LEFT JOIN payments pay ON r.id = pay.registration_id;

-- Count stats
-- SELECT 
--   COUNT(DISTINCT r.id) as total_registrations,
--   COUNT(DISTINCT p.id) as total_players,
--   COUNT(DISTINCT t.id) as total_trials,
--   SUM(pay.amount) as total_revenue
-- FROM registrations r
-- JOIN players p ON r.player_id = p.id
-- JOIN trials t ON r.trial_id = t.id
-- LEFT JOIN payments pay ON r.id = pay.registration_id;

-- Update existing registration status
-- UPDATE registrations SET status = 'approved' WHERE id = 'uuid-here';

-- Update existing payment status
-- UPDATE payments SET status = 'completed', payment_date = CURRENT_TIMESTAMP WHERE id = 'uuid-here';

-- Add a new player
-- INSERT INTO players (name, email, phone) VALUES ('New Player', 'new@company.com', '+1-555-123-4599');

-- Add a new registration
-- INSERT INTO registrations (player_id, trial_id, state, status) 
-- SELECT p.id, t.id, 'CA', 'pending'
-- FROM players p, trials t
-- WHERE p.email = 'new@company.com' AND t.name = 'Your Trial 1';
