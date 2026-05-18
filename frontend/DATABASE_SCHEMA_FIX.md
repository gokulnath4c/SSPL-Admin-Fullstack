📋 **DATABASE SCHEMA MISMATCH - FIX GUIDE**

═══════════════════════════════════════════════════════════════════════════

🔍 **THE PROBLEM**

Your Supabase database has a different schema than what we created:

**Your Actual Tables:**
- `player_registrations` (with full_name, email, phone, date_of_birth, state, city, etc.)
- `registrations` (payment information)

**What We Created:**
- `players`, `trials`, `registrations`, `payments` (different structure)

The error occurs because the JOIN was looking for `registration_id` column that doesn't exist.

═══════════════════════════════════════════════════════════════════════════

✅ **SOLUTION**

I've updated your React app to work with your **actual database structure**.

The app now:
1. ✅ Tries RPC function `get_all_player_registrations()` (NEW)
2. ✅ Falls back to direct `player_registrations` table query
3. ✅ Maps your columns to display format
4. ✅ Shows mock data if database unavailable

═══════════════════════════════════════════════════════════════════════════

🔧 **STEP 1: Create the RPC Function in Supabase**

Go to Supabase SQL Editor and run:

```sql
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
  position VARCHAR,
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
    pr.id,
    pr.full_name,
    pr.email,
    pr.phone,
    pr.date_of_birth,
    pr.state,
    pr.city,
    pr.pincode,
    pr.position,
    pr.preferred_trials,
    pr.created_at,
    r.amount,
    r.status,
    r.order_id,
    r.payment_id,
    r.created_at
  FROM player_registrations pr
  LEFT JOIN registrations r ON r.player_registration_id = pr.id
  ORDER BY pr.created_at DESC;
END;
$$;
```

✅ Click **RUN**

═══════════════════════════════════════════════════════════════════════════

🔧 **STEP 2: Test the RPC Function**

Run this query:

```sql
SELECT * FROM get_all_player_registrations() LIMIT 10;
```

Should return your player data with payment info!

═══════════════════════════════════════════════════════════════════════════

🔧 **STEP 3: Refresh Your React App**

1. Refresh browser (F5)
2. Navigate to Registrations page
3. Should show your real player data
4. Yellow "Demo Data" banner disappears

═══════════════════════════════════════════════════════════════════════════

🐛 **TROUBLESHOOTING**

If it still shows demo data:

**Option A - Check your column names:**
Run in SQL Editor:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'player_registrations';
```

**Option B - Test direct table access:**
```sql
SELECT * FROM player_registrations LIMIT 5;
```

**Option C - Check join column:**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'registrations';
```

Find the column that links to `player_registrations` (might be `player_registration_id`, `registration_id`, `pr_id`, etc.)

**Option D - Update the RPC function with correct column names:**
If the join column is different, update this line in the RPC function:
```sql
LEFT JOIN registrations r ON r.[YOUR_COLUMN_NAME] = pr.id
```

═══════════════════════════════════════════════════════════════════════════

📝 **HOW IT WORKS NOW**

1. **First Try**: Calls `get_all_player_registrations()` RPC
   - If works → Shows your real player data
   - If fails → Goes to backup

2. **Backup**: Direct query to `player_registrations` table
   - Fetches latest 111 registrations
   - Maps columns to display format
   - Shows basic info (name, email, position, etc.)

3. **Last Resort**: Shows mock data
   - Only if both above fail
   - Yellow banner indicates demo mode

═══════════════════════════════════════════════════════════════════════════

🎯 **NEXT STEPS**

1. Create the RPC function (copy-paste from Step 1 above)
2. Test it (Run query from Step 2)
3. Refresh React app (F5)
4. Check Registrations page
5. If issues, run troubleshooting commands

Your dashboard will automatically display your real player data! 🚀

═══════════════════════════════════════════════════════════════════════════

📞 **NEED HELP?**

If still having issues, provide:
1. Output of: `SELECT column_name FROM information_schema.columns WHERE table_name = 'registrations';`
2. A sample row from: `SELECT * FROM player_registrations LIMIT 1;`
3. A sample row from: `SELECT * FROM registrations LIMIT 1;`

This will help me write the exact query for your schema!

═══════════════════════════════════════════════════════════════════════════
