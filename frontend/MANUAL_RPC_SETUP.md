# ⚡ Manual Supabase RPC Setup Instructions

Since direct SQL execution via API requires additional setup, please follow these manual steps:

## Step-by-Step Setup Guide

### 1. Access Your Supabase Dashboard
- Go to: https://app.supabase.com
- Select your project: `fazpykekypcktcmniwbj`

### 2. Open SQL Editor
- Click **SQL Editor** in the left sidebar
- Click **New Query** button

### 3. Create Players Table
Copy and paste this SQL, then click **RUN**:

```sql
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);
```

**Expected Result**: ✅ "Query executed successfully"

### 4. Create Trials Table
Create a new query and paste:

```sql
CREATE TABLE IF NOT EXISTS trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Create Registrations Table
Create a new query and paste:

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

CREATE INDEX IF NOT EXISTS idx_registrations_player_id ON registrations(player_id);
CREATE INDEX IF NOT EXISTS idx_registrations_trial_id ON registrations(trial_id);
CREATE INDEX IF NOT EXISTS idx_registrations_state ON registrations(state);
```

### 6. Create Payments Table
Create a new query and paste:

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

CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON payments(registration_id);
```

### 7. Create RPC Function
**This is the most important step!** Create a new query and paste:

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

**Expected Result**: ✅ "Function created successfully"

### 8. Insert Sample Trials
Create a new query and paste:

```sql
INSERT INTO trials (name, description) VALUES
  ('Trial A', 'Bronze Level Trial'),
  ('Trial B', 'Silver Level Trial'),
  ('Trial C', 'Gold Level Trial')
ON CONFLICT DO NOTHING;
```

### 9. Insert Sample Players
Create a new query and paste:

```sql
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
```

### 10. Insert Sample Registrations
Create a new query and paste:

```sql
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
```

### 11. Insert Sample Payments
Create a new query and paste:

```sql
INSERT INTO payments (registration_id, amount, status, payment_date)
SELECT 
  r.id,
  500.00,
  CASE WHEN r.status = 'pending' THEN 'pending' ELSE 'completed' END,
  CASE WHEN r.status = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP - (RANDOM() * 7)::int * INTERVAL '1 day' END
FROM registrations r
WHERE r.status IS NOT NULL
ON CONFLICT DO NOTHING;
```

## Verification Steps

After completing all steps:

1. **Verify Tables Exist**
   - Create a new query:
   ```sql
   SELECT COUNT(*) as player_count FROM players;
   SELECT COUNT(*) as trial_count FROM trials;
   SELECT COUNT(*) as registration_count FROM registrations;
   SELECT COUNT(*) as payment_count FROM payments;
   ```

2. **Test RPC Function**
   - Create a new query:
   ```sql
   SELECT * FROM get_player_registrations();
   ```
   - Should return 8 rows with all registration data

3. **Test in React App**
   - Open http://localhost:3000/diagnostics
   - Click "Full Diagnostics" button
   - Should show ✅ for all tests
   - Should display 8 records in the data table

## Adding Your Real Data

The test data above is just for demonstration. To add your actual player data:

### 12. Clear Sample Data (Optional)
If you want to start fresh with only your data:
```sql
DELETE FROM payments;
DELETE FROM registrations;
DELETE FROM players;
DELETE FROM trials;
```

### 13. Insert Your Trials
Replace the trial names with your actual trials:
```sql
INSERT INTO trials (name, description) VALUES
  ('Your Trial 1', 'Description here'),
  ('Your Trial 2', 'Description here'),
  ('Your Trial 3', 'Description here');
```

### 14. Insert Your Players
Replace with your actual player data:
```sql
INSERT INTO players (name, email, phone) VALUES
  ('Player Name 1', 'email1@example.com', '+1-234-567-8900'),
  ('Player Name 2', 'email2@example.com', '+1-234-567-8901'),
  ('Player Name 3', 'email3@example.com', '+1-234-567-8902');
```

### 15. Insert Your Registrations
Update with your actual registration data:
```sql
INSERT INTO registrations (player_id, trial_id, state, status, notes) 
SELECT p.id, t.id, s.state, s.status, s.notes
FROM (VALUES
  ('email1@example.com', 'Your Trial 1', 'CA', 'approved', 'Your notes'),
  ('email2@example.com', 'Your Trial 2', 'TX', 'pending', 'Your notes'),
  ('email3@example.com', 'Your Trial 1', 'FL', 'approved', 'Your notes')
) AS s(email, trial_name, state, status, notes)
JOIN players p ON p.email = s.email
JOIN trials t ON t.name = s.trial_name;
```

### 16. Insert Your Payments
Update payment amounts and statuses for your data:
```sql
INSERT INTO payments (registration_id, amount, status, payment_date)
SELECT 
  r.id,
  250.00,  -- Your amount here
  'completed',  -- or 'pending'/'failed'
  CURRENT_TIMESTAMP
FROM registrations r;
```

After inserting your real data:
1. Refresh your React app (F5)
2. Dashboard will automatically show your real data
3. Yellow demo banner disappears

---

## Troubleshooting

### "Query syntax error"
- Double-check the SQL for typos
- Make sure you copied the entire query
- Try running one statement at a time

### "Function not found" error in React app
- Verify the RPC function was created (Step 7)
- Run `SELECT * FROM get_player_registrations();` in SQL Editor
- If it works there but not in app, wait 30 seconds and refresh

### No data showing in app
- Verify all tables have data (Verification Step 1)
- Check joins are correct (Verification Step 2)
- Try clicking "Refresh" button in app

### Seeing test data but want real data
- Run Step 12 to clear sample data
- Run Steps 13-16 to insert your real data
- Refresh app
- Real data will display automatically

### Tables not created
- Check if they already exist: try dropping them first
- ```sql
  DROP TABLE IF EXISTS payments CASCADE;
  DROP TABLE IF EXISTS registrations CASCADE;
  DROP TABLE IF EXISTS trials CASCADE;
  DROP TABLE IF EXISTS players CASCADE;
  ```
- Then run the CREATE TABLE commands again

## Next Steps

After completing setup:

1. ✅ Visit **Dashboard**: http://localhost:3000/dashboard
   - See charts with real data
   - Remove yellow demo data banner

2. ✅ Visit **Registrations**: http://localhost:3000/registrations
   - View all 8 players
   - See full registration details

3. ✅ Visit **Reports**: http://localhost:3000/reports
   - View analytics

4. ✅ Visit **Diagnostics**: http://localhost:3000/diagnostics
   - Run full diagnostics
   - Confirm all tests pass ✅

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify all SQL commands were executed successfully
3. Check browser console for error messages
4. Visit the Diagnostics page for detailed error information

---

**That's it!** Your Supabase RPC function is now set up and your React app will automatically display real data. 🎉
