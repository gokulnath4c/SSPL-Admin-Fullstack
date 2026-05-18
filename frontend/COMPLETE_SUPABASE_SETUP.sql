-- ✅ COMPLETE SUPABASE SETUP FOR ADMIN PANEL
-- This script creates all required tables and RPC functions for real data

-- =============================================
-- STEP 1: CREATE REQUIRED TABLES
-- =============================================

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  date_of_birth DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trials table
CREATE TABLE IF NOT EXISTS trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  trial_id UUID REFERENCES trials(id) ON DELETE SET NULL,
  state VARCHAR(100),
  city VARCHAR(100),
  pincode VARCHAR(20),
  player_position VARCHAR(100),
  preferred_trials TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2),
  order_id VARCHAR(255),
  payment_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_registrations_player_id ON registrations(player_id);
CREATE INDEX IF NOT EXISTS idx_registrations_trial_id ON registrations(trial_id);
CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON payments(registration_id);

-- =============================================
-- STEP 2: CREATE REQUIRED RPC FUNCTIONS
-- =============================================

-- Main RPC function for dashboard and registrations
CREATE OR REPLACE FUNCTION get_player_registrations()
RETURNS TABLE (
  id UUID,
  player_name VARCHAR,
  player_email VARCHAR,
  phone VARCHAR,
  registration_date TIMESTAMP,
  state VARCHAR,
  trial_name VARCHAR,
  payment_status VARCHAR,
  payment_amount DECIMAL,
  status VARCHAR,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id::UUID,
    p.name::VARCHAR,
    p.email::VARCHAR,
    p.phone::VARCHAR,
    r.registration_date::TIMESTAMP,
    r.state::VARCHAR,
    t.name::VARCHAR,
    COALESCE(pay.status, 'pending')::VARCHAR,
    COALESCE(pay.amount, 0)::DECIMAL,
    r.status::VARCHAR,
    r.notes::TEXT
  FROM registrations r
  LEFT JOIN players p ON r.player_id = p.id
  LEFT JOIN trials t ON r.trial_id = t.id
  LEFT JOIN payments pay ON pay.registration_id = r.id
  ORDER BY r.registration_date DESC;
END;
$$;

-- RPC function for all registrations (alternative)
CREATE OR REPLACE FUNCTION get_all_player_registrations()
RETURNS TABLE (
  player_id UUID,
  full_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  date_of_birth DATE,
  state VARCHAR,
  city VARCHAR,
  pincode VARCHAR,
  player_position VARCHAR,
  preferred_trials VARCHAR,
  registration_date TIMESTAMP,
  payment_amount DECIMAL,
  payment_status VARCHAR,
  order_id VARCHAR,
  payment_id VARCHAR,
  payment_date TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id::UUID,
    p.name::VARCHAR,
    p.email::VARCHAR,
    p.phone::VARCHAR,
    p.date_of_birth::DATE,
    r.state::VARCHAR,
    r.city::VARCHAR,
    r.pincode::VARCHAR,
    r.player_position::VARCHAR,
    r.preferred_trials::VARCHAR,
    r.registration_date::TIMESTAMP,
    COALESCE(pay.amount, 0)::DECIMAL,
    COALESCE(pay.status, 'pending')::VARCHAR,
    pay.order_id::VARCHAR,
    pay.payment_id::VARCHAR,
    pay.payment_date::TIMESTAMP
  FROM players p
  LEFT JOIN registrations r ON p.id = r.player_id
  LEFT JOIN payments pay ON pay.registration_id = r.id
  ORDER BY r.registration_date DESC;
END;
$$;

-- =============================================
-- STEP 3: INSERT SAMPLE DATA FOR TESTING
-- =============================================

-- Insert sample trials
INSERT INTO trials (name, description, start_date, end_date, location)
VALUES
  ('Trial A', 'Beginner level cricket trial', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 'Mumbai'),
  ('Trial B', 'Intermediate level cricket trial', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 'Delhi'),
  ('Trial C', 'Advanced level cricket trial', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', 'Bangalore')
ON CONFLICT (name) DO NOTHING;

-- Insert sample players
INSERT INTO players (name, email, phone, date_of_birth)
VALUES
  ('John Doe', 'john@example.com', '+1-234-567-8900', '1990-01-15'),
  ('Jane Smith', 'jane@example.com', '+1-234-567-8901', '1992-03-22'),
  ('Bob Johnson', 'bob@example.com', '+1-234-567-8902', '1988-07-10'),
  ('Alice Williams', 'alice@example.com', '+1-234-567-8903', '1995-11-05'),
  ('Charlie Brown', 'charlie@example.com', '+1-234-567-8904', '1993-09-18')
ON CONFLICT (email) DO NOTHING;

-- Insert sample registrations
INSERT INTO registrations (player_id, trial_id, state, city, pincode, player_position, preferred_trials, status, registration_date, notes)
VALUES
  ((SELECT id FROM players WHERE email = 'john@example.com'), (SELECT id FROM trials WHERE name = 'Trial A'), 'Maharashtra', 'Mumbai', '400001', 'Batsman', 'Trial A, Trial B', 'approved', CURRENT_TIMESTAMP - INTERVAL '15 days', 'Verified player'),
  ((SELECT id FROM players WHERE email = 'jane@example.com'), (SELECT id FROM trials WHERE name = 'Trial B'), 'Delhi', 'New Delhi', '110001', 'Bowler', 'Trial B, Trial C', 'pending', CURRENT_TIMESTAMP - INTERVAL '10 days', 'Awaiting payment'),
  ((SELECT id FROM players WHERE email = 'bob@example.com'), (SELECT id FROM trials WHERE name = 'Trial A'), 'Karnataka', 'Bangalore', '560001', 'All-rounder', 'Trial A', 'approved', CURRENT_TIMESTAMP - INTERVAL '8 days', 'Gold tier member'),
  ((SELECT id FROM players WHERE email = 'alice@example.com'), (SELECT id FROM trials WHERE name = 'Trial C'), 'Tamil Nadu', 'Chennai', '600001', 'Wicketkeeper', 'Trial C', 'approved', CURRENT_TIMESTAMP - INTERVAL '5 days', 'Regular member'),
  ((SELECT id FROM players WHERE email = 'charlie@example.com'), (SELECT id FROM trials WHERE name = 'Trial B'), 'West Bengal', 'Kolkata', '700001', 'Batsman', 'Trial B', 'pending', CURRENT_TIMESTAMP - INTERVAL '3 days', 'New registration')
ON CONFLICT (player_id, trial_id) DO NOTHING;

-- Insert sample payments
INSERT INTO payments (registration_id, amount, order_id, payment_id, status, payment_date)
VALUES
  ((SELECT id FROM registrations WHERE player_id = (SELECT id FROM players WHERE email = 'john@example.com')), 500.00, 'order_john123', 'pay_john123', 'completed', CURRENT_TIMESTAMP - INTERVAL '14 days'),
  ((SELECT id FROM registrations WHERE player_id = (SELECT id FROM players WHERE email = 'bob@example.com')), 500.00, 'order_bob456', 'pay_bob456', 'completed', CURRENT_TIMESTAMP - INTERVAL '7 days'),
  ((SELECT id FROM registrations WHERE player_id = (SELECT id FROM players WHERE email = 'alice@example.com')), 500.00, 'order_alice789', 'pay_alice789', 'completed', CURRENT_TIMESTAMP - INTERVAL '4 days'),
  ((SELECT id FROM registrations WHERE player_id = (SELECT id FROM players WHERE email = 'jane@example.com')), 500.00, 'order_jane101', 'pay_jane101', 'pending', NULL),
  ((SELECT id FROM registrations WHERE player_id = (SELECT id FROM players WHERE email = 'charlie@example.com')), 500.00, 'order_charlie202', 'pay_charlie202', 'pending', NULL)
ON CONFLICT (registration_id) DO NOTHING;

-- =============================================
-- STEP 4: VERIFICATION QUERIES
-- =============================================

-- Verify tables were created
SELECT 'players' as table_name, COUNT(*) as record_count FROM players
UNION ALL
SELECT 'trials' as table_name, COUNT(*) as record_count FROM trials
UNION ALL
SELECT 'registrations' as table_name, COUNT(*) as record_count FROM registrations
UNION ALL
SELECT 'payments' as table_name, COUNT(*) as record_count FROM payments;

-- Test the main RPC function
SELECT * FROM get_player_registrations() LIMIT 10;

-- Test the alternative RPC function
SELECT * FROM get_all_player_registrations() LIMIT 10;

-- =============================================
-- SETUP COMPLETE!
-- =============================================
-- Your admin panel should now show real data instead of mock data.
-- Refresh the admin panel to see the changes.