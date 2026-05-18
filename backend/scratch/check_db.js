require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function checkDatabase() {
    const { count, error } = await supabase
        .from('razorpay_ledger')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error fetching count:', error);
        return;
    }

    console.log(`Total records in razorpay_ledger: ${count}`);

    const { data: samples, error: sampleError } = await supabase
        .from('razorpay_ledger')
        .select('payment_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (sampleError) {
        console.error('Error fetching samples:', sampleError);
        return;
    }

    console.log('Latest 5 records in database:');
    console.table(samples);
}

checkDatabase();
