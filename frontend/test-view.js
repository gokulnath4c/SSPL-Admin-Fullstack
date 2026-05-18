const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fazpykekypcktcmniwbj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenB5a2VreXBja3RjbW5pd2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MjQyMzcsImV4cCI6MjA3MTQwMDIzN30.98XobDzYVd8eyUVpnOLNaCgw0l8AnTIR886Eja-Z_hM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testView() {
    console.log('Testing v_admin_player_registrations view...\n');

    try {
        // Test querying the view
        const { data, error, count } = await supabase
            .from('v_admin_player_registrations')
            .select('*', { count: 'exact' });

        if (error) {
            console.error('❌ Error querying view:', error.message);
            console.log('\n⚠️  The view does not exist or cannot be queried.');
            console.log('\nYou need to run the following SQL in the Supabase SQL Editor:');
            console.log('(Go to https://fazpykekypcktcmniwbj.supabase.co → SQL Editor)\n');
            console.log('='.repeat(60));
            console.log(`
CREATE OR REPLACE VIEW v_admin_player_registrations AS
SELECT DISTINCT ON (email)
  id,
  full_name as player_name,
  email as player_email,
  phone,
  created_at as registration_date,
  state,
  city,
  pincode,
  payment_status,
  payment_amount,
  status,
  position,
  'General' as trial_name,
  CONCAT('Position: ', position) as notes
FROM player_registrations
ORDER BY email, created_at DESC;
      `);
            console.log('='.repeat(60) + '\n');
            process.exit(1);
        }

        console.log(`✅ View exists and returned ${data?.length || 0} records`);
        console.log(`   Total count: ${count || 0}`);

        if (data && data.length > 0) {
            // Calculate stats
            const totalRegistrations = data.length;
            const paidCount = data.filter(r => r.payment_status === 'completed' || r.payment_status === 'captured').length;
            const unpaidCount = totalRegistrations - paidCount;
            const states = new Set(data.map(r => r.state).filter(Boolean));

            console.log('\n📊 Dashboard Statistics:');
            console.log(`   Total Registrations: ${totalRegistrations}`);
            console.log(`   Paid: ${paidCount}`);
            console.log(`   Unpaid: ${unpaidCount}`);
            console.log(`   States Covered: ${states.size}`);

            console.log('\n📝 Sample record:');
            console.log(JSON.stringify(data[0], null, 2));

            console.log('\n✅ The dashboard should now display actual data!');
            console.log('   Refresh your dashboard at: http://localhost:3000/dashboard');
        } else {
            console.log('\n⚠️  View exists but returned no data.');
            console.log('   Check if player_registrations table has data.');
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err.message);
        process.exit(1);
    }
}

testView();
