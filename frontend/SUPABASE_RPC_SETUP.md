# Supabase RPC Function Setup Guide

## Step 1: Create Tables in Supabase

### 1.1 Players Table
```sql
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_players_email ON players(email);
```

### 1.2 Trials Table
```sql
CREATE TABLE IF NOT EXISTS trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.3 Registrations Table
```sql
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  trial_id UUID NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  state VARCHAR(2) NOT NULL,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_registrations_player_id ON registrations(player_id);
CREATE INDEX idx_registrations_trial_id ON registrations(trial_id);
CREATE INDEX idx_registrations_state ON registrations(state);
```

### 1.4 Payments Table
```sql
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_registration_id ON payments(registration_id);
```

## Step 2: Create RPC Function

Go to your Supabase Dashboard → SQL Editor → Create a new query and run:

```sql
CREATE OR REPLACE FUNCTION get_player_registrations()
RETURNS TABLE (
  id UUID,
  player_name VARCHAR,
  player_email VARCHAR,
  phone VARCHAR,
  registration_date TIMESTAMP,
  status VARCHAR,
  payment_status VARCHAR,
  payment_amount DECIMAL,
  payment_date TIMESTAMP,
  notes TEXT,
  state VARCHAR,
  trial_name VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    p.name AS player_name,
    p.email AS player_email,
    p.phone,
    r.registration_date,
    r.status,
    COALESCE(pay.status, 'pending') AS payment_status,
    pay.amount AS payment_amount,
    pay.payment_date,
    r.notes,
    r.state,
    t.name AS trial_name
  FROM registrations r
  JOIN players p ON r.player_id = p.id
  JOIN trials t ON r.trial_id = t.id
  LEFT JOIN payments pay ON r.id = pay.registration_id
  ORDER BY r.registration_date DESC;
END;
$$;
```

## Step 3: Insert Sample Data (Optional)

```sql
-- Insert sample trials
INSERT INTO trials (name, description) VALUES
  ('Trial A', 'Bronze Level Trial'),
  ('Trial B', 'Silver Level Trial'),
  ('Trial C', 'Gold Level Trial')
ON CONFLICT DO NOTHING;

-- Insert sample players
INSERT INTO players (name, email, phone) VALUES
  ('John Doe', 'john@example.com', '+1-234-567-8900'),
  ('Jane Smith', 'jane@example.com', '+1-234-567-8901'),
  ('Bob Johnson', 'bob@example.com', '+1-234-567-8902'),
  ('Alice Williams', 'alice@example.com', '+1-234-567-8903'),
  ('Charlie Brown', 'charlie@example.com', '+1-234-567-8904'),
  ('Diana Prince', 'diana@example.com', '+1-234-567-8905'),
  ('Eve Adams', 'eve@example.com', '+1-234-567-8906'),
  ('Frank Miller', 'frank@example.com', '+1-234-567-8907')
ON CONFLICT (email) DO NOTHING;

-- Insert sample registrations
INSERT INTO registrations (player_id, trial_id, state, status, notes) 
SELECT p.id, t.id, s.state, s.status, s.notes
FROM (VALUES
  ('john@example.com', 'Trial A', 'CA', 'approved', 'Verified player'),
  ('jane@example.com', 'Trial B', 'TX', 'pending', 'Awaiting payment'),
  ('bob@example.com', 'Trial A', 'CA', 'approved', 'Gold tier member'),
  ('alice@example.com', 'Trial C', 'FL', 'approved', 'Regular member'),
  ('charlie@example.com', 'Trial B', 'NY', 'pending', 'New registration'),
  ('diana@example.com', 'Trial A', 'TX', 'approved', 'Premium member'),
  ('eve@example.com', 'Trial C', 'CA', 'approved', 'Active player'),
  ('frank@example.com', 'Trial B', 'PA', 'pending', 'Pending approval')
) AS s(email, trial_name, state, status, notes)
JOIN players p ON p.email = s.email
JOIN trials t ON t.name = s.trial_name
ON CONFLICT DO NOTHING;

-- Insert sample payments
INSERT INTO payments (registration_id, amount, status, payment_date)
SELECT 
  r.id,
  500.00,
  CASE WHEN r.status = 'pending' THEN 'pending' ELSE 'completed' END,
  CASE WHEN r.status = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP - (RANDOM() * 7)::int DAY END
FROM registrations r
WHERE r.status IS NOT NULL
ON CONFLICT DO NOTHING;
```

## Step 4: Enable RPC in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Policies**
3. Make sure your function is accessible by your authenticated users

## Step 5: Test the RPC Function

In your browser console or using a REST client:

```javascript
// Using Supabase JS client
const { data, error } = await supabase.rpc('get_player_registrations')
if (error) console.error('Error:', error)
else console.log('Data:', data)
```

## Step 6: Application Integration

The application automatically:
1. ✅ Calls `supabase.rpc('get_player_registrations')` on component mount
2. ✅ Falls back to mock data if RPC fails
3. ✅ Displays dashboard charts with real data
4. ✅ Shows registrations table with full details
5. ✅ Calculates statistics automatically

## Troubleshooting

### RPC Function Not Found (404)
- Verify the function name matches exactly: `get_player_registrations`
- Ensure you've created it in the correct database
- Check Supabase SQL Editor for any errors

### Permission Denied
- Add Row Level Security (RLS) policy or disable it for development:
```sql
ALTER TABLE registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE trials DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
```

### Data Not Appearing
- Run sample data insertion script above
- Check that tables have data: `SELECT COUNT(*) FROM players;`
- Verify joins are working in SQL Editor

## Next Steps

1. Copy and paste each SQL block into Supabase SQL Editor
2. Execute them one by one
3. Refresh your React application
4. Charts and data should now display with real data instead of mock data
5. Remove the mock data banner when ready

