const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://fazpykekypcktcmniwbj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenB5a2VreXBja3RjbW5pd2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MjQyMzcsImV4cCI6MjA3MTQwMDIzN30.98XobDzYVd8eyUVpnOLNaCgw0l8AnTIR886Eja-Z_hM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createView() {
    console.log('Creating v_admin_player_registrations view...\n');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'CREATE_UNIQUE_VIEW.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Extract just the CREATE OR REPLACE VIEW statement
    const createViewSQL = `
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
  `;

    try {
        const { data, error } = await supabase.rpc('exec_sql', { query: createViewSQL });

        if (error) {
            console.error('❌ Error creating view:', error.message);
            console.log('\nNote: The Supabase anon key may not have permissions to create views.');
            console.log('You need to run this SQL directly in the Supabase SQL Editor:');
            console.log('\n' + '='.repeat(50));
            console.log(createViewSQL);
            console.log('='.repeat(50) + '\n');
            process.exit(1);
        }

        console.log('✅ View created successfully!');

        // Test the view
        console.log('\nTesting view by fetching data...');
        const { data: testData, error: testError } = await supabase
            .from('v_admin_player_registrations')
            .select('*')
            .limit(5);

        if (testError) {
            console.error('❌ Error testing view:', testError.message);
            process.exit(1);
        }

        console.log(`✅ View test successful! Found ${testData?.length || 0} sample records.`);
        if (testData && testData.length > 0) {
            console.log('\nSample record:');
            console.log(JSON.stringify(testData[0], null, 2));
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err.message);
        console.log('\nPlease run the following SQL in the Supabase SQL Editor:');
        console.log('\n' + '='.repeat(50));
        console.log(createViewSQL);
        console.log('='.repeat(50) + '\n');
        process.exit(1);
    }
}

createView();
