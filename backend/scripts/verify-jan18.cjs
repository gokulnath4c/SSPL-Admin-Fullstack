require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function verifySync() {
    console.log('🔍 Verifying Razorpay Ledger for Jan 18, 2026...');

    const { count, error } = await supabase
        .from('razorpay_ledger')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', '2026-01-18T00:00:00Z')
        .lte('created_at', '2026-01-18T23:59:59Z');

    if (error) {
        console.error('❌ Verification Error:', error);
    } else {
        console.log(`✅ Found ${count} records for Jan 18, 2026 in razorpay_ledger.`);
    }
}

verifySync();
