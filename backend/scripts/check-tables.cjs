const supabase = require('../config/supabase.cjs');

async function checkTables() {
    const tables = ['registrations', 'player_registrations', 'razorpay_ledger'];

    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.log(`❌ Table '${table}': Error - ${error.message}`);
            } else {
                console.log(`✅ Table '${table}': Exists (Count: ${count})`);
            }
        } catch (err) {
            console.log(`❌ Table '${table}': Exception - ${err.message}`);
        }
    }
}

checkTables();
