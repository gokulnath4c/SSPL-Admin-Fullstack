# 🚀 Complete Supabase RPC Integration Guide

## Overview

Your React Admin Dashboard is now fully integrated with Supabase. This guide walks you through setting up the RPC function to display real player registration data.

## Quick Start (5 Minutes)

### Step 1: Access Supabase Dashboard
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project: `fazpykekypcktcmniwbj`
3. Navigate to **SQL Editor** (left sidebar)

### Step 2: Create Database Tables

Copy and paste each SQL block below into the SQL Editor and click **Execute**:

#### Table 1: Players
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

#### Table 2: Trials
```sql
CREATE TABLE IF NOT EXISTS trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Table 3: Registrations
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

#### Table 4: Payments
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

### Step 3: Create the RPC Function

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

### Step 4: Insert Sample Data

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
  CASE WHEN r.status = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP - (RANDOM() * 7)::int * INTERVAL '1 day' END
FROM registrations r
WHERE r.status IS NOT NULL
ON CONFLICT DO NOTHING;
```

### Step 5: Test the Connection

1. Log in to your React app at `http://localhost:3000/login`
2. Navigate to **Diagnostics** in the sidebar (🔧 icon)
3. Click **Full Diagnostics** button
4. Check the results - should show ✅ for all tests
5. If you see data in the table, you're connected!

### Step 6: View Your Data

- **Dashboard**: `http://localhost:3000/dashboard` - See charts and statistics
- **Registrations**: `http://localhost:3000/registrations` - View all player registrations
- **Reports**: `http://localhost:3000/reports` - Analytics and reports

## Application Features

### 📊 Dashboard Page
- **Total Registrations** card showing all players
- **Paid/Unpaid** statistics with percentages
- **Payment Distribution** pie chart (green/red)
- **State-wise Distribution** pie chart (multi-color)
- **Registration Trend** line chart (last 30 days)
- **Trial-wise Distribution** bar chart
- Auto-refresh button

### 📝 Registrations Page
- **Statistics Cards**: Total, Pending, Approved, Payments
- **Full Table View**: All player details
- **Payment Status** indicator
- **Registration Status** badge
- **Action Buttons**: View, Approve, Reject (ready for backend integration)
- Refresh button to reload data

### 📈 Reports Page
- **Report Cards**: User, Activity, Performance, Security reports
- **Status Indicators**: Completed, Processing, Failed
- **Filter Options**: By type and status
- **Report Statistics**: Summary dashboard
- Export and download functionality

### 🔧 Diagnostics Page
- **Test Supabase Connection**: Verify auth
- **Test RPC Function**: Verify database connectivity
- **Full Diagnostics**: Run all checks at once
- **Live Data Display**: Show returned records
- **Statistics**: Count breakdowns by payment/registration status
- **Troubleshooting Tips**: Built-in help

## Automatic Fallback System

✨ **Important**: Your app has built-in mock data fallback:
- If RPC function doesn't exist: Shows demo data ✅
- If connection fails: Shows demo data ✅
- Yellow warning banner informs you of demo mode
- Automatically switches to real data when RPC is set up ✅

## Troubleshooting

### "Failed to load resource: 404"
**Solution**: RPC function not created yet
- Verify all SQL commands were executed
- Check function name is exactly: `get_player_registrations`
- Look for error messages in Supabase SQL Editor

### "Permission Denied" Error
**Solution**: Row Level Security (RLS) policies blocking access
```sql
ALTER TABLE registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE trials DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
```

### No Data Showing
**Solution**: Tables are empty
- Run the sample data insertion script above
- Verify with: `SELECT COUNT(*) FROM registrations;`
- Check joins are working in SQL Editor

### Chart Shows "No data available"
**Solution**: RPC returns no records
1. Check registrations table has data
2. Verify joins in RPC function
3. Run diagnostic from app to see raw data

## Testing RPC in Browser Console

```javascript
// In browser DevTools Console
import { runFullDiagnostics } from '@api/rpcTest'
await runFullDiagnostics()
```

## API Integration Notes

### Hook: `useDashboard`
Returns statistics for dashboard charts:
- `totalRegistrations` - Count
- `paidCount` - Paid registrations
- `unpaidCount` - Unpaid registrations
- `stateDistribution` - By state
- `trialDistribution` - By trial
- `registrationTrend` - 30-day trend
- `isUsingMockData` - Flag for demo mode

### Hook: `useRegistrations`
Returns full registration list:
- `registrations` - Array of player registrations
- `loading` - Loading state
- `error` - Error message
- `isUsingMockData` - Flag for demo mode
- `refetch()` - Manual reload function

### Both hooks automatically:
✅ Switch to mock data if RPC fails
✅ Show loading states
✅ Handle errors gracefully
✅ Support manual refresh
✅ Track real vs demo data

## Next Steps

1. ✅ Set up all tables (Step 2)
2. ✅ Create RPC function (Step 3)
3. ✅ Insert sample data (Step 4)
4. ✅ Test connection (Step 5)
5. ✅ View your data (Step 6)
6. 📝 Customize as needed
7. 🚀 Deploy to production

## File References

- **Setup Guide**: `SUPABASE_RPC_SETUP.md`
- **Dashboard**: `src/pages/DashboardPage.tsx`
- **Registrations**: `src/pages/RegistrationsPage.tsx`
- **Diagnostics**: `src/pages/DiagnosticsPage.tsx`
- **Dashboard Hook**: `src/hooks/useDashboard.ts`
- **Registrations Hook**: `src/hooks/useRegistrations.ts`
- **Test Utilities**: `src/api/rpcTest.ts`

---

**Questions?** Check the diagnostics page for live testing and troubleshooting!
