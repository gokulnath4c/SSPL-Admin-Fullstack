require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function debug() {
    console.log('🔍 Diagnostics Started');
    console.log('Target Table: razorpay_ledger');
    console.log('Using Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role (Admin)' : 'Anon (Public)');

    try {
        const { data, error, count } = await supabase
            .from('razorpay_ledger')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Supabase Error:', error.code, error.message);
            if (error.code === 'PGRST205') {
                console.error('🚨 CRITICAL: The table "razorpay_ledger" does not exist in the database.');
                console.error('👉 You MUST run the SQL from "backend/init_razorpay_ledger.sql" in your Supabase Dashboard.');
            }
        } else {
            console.log('✅ Connection Successful');
            console.log('Table exists. Row count:', count);
        }

    } catch (err) {
        console.error('❌ Exception:', err);
    }
}

debug();
