const supabase = require('../config/supabase.cjs');

async function testLimit() {
    console.log('Testing Supabase Query Limit...');

    try {
        // Test 1: Default Limit (should be 1000)
        const { data: data1, error: error1 } = await supabase
            .from('razorpay_ledger')
            .select('payment_id');

        console.log('Test 1 (Default):', data1 ? data1.length : 'Error', error1 ? error1.message : '');

        // Test 2: Explicit Limit 100,000
        const { data: data2, error: error2 } = await supabase
            .from('razorpay_ledger')
            .select('payment_id')
            .limit(100000);

        console.log('Test 2 (Limit 100k):', data2 ? data2.length : 'Error', error2 ? error2.message : '');

        if (data2 && data2.length > 1000) {
            console.log('✅ Limit works! The issue is likely the running server instance.');
        } else {
            console.log('❌ Limit NOT working. Count is stuck at', data2 ? data2.length : 0);
        }

    } catch (e) {
        console.error(e);
    }
}

testLimit();
