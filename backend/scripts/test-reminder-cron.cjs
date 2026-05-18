require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');
const { checkAndSendReminders } = require('../cron/payment-reminders.cjs');

async function runTest() {
    console.log('🧪 Starting Verification Test...');
    const testEmail = 'antigravity_test@example.com';
    const testPaymentId = 'pay_test_' + Date.now();

    try {
        // 1. Setup: Insert Mock Failed Payment (45 mins ago)
        const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();

        console.log('📝 Inserting mock failed payment...');
        const { error: insertError } = await supabase.from('razorpay_ledger').insert({
            payment_id: testPaymentId,
            order_id: 'order_test_123',
            amount: 500,
            currency: 'INR',
            status: 'failed',
            method: 'upi',
            email: testEmail,
            contact: '9999999999',
            created_at: fortyFiveMinsAgo,
            last_synced_at: new Date().toISOString()
        });

        if (insertError) throw new Error('Insert failed: ' + insertError.message);

        // 2. Run Cron Logic
        console.log('🚀 Triggering cron job manually...');
        await checkAndSendReminders();

        // 3. Verify Log
        console.log('🔍 Verifying email log...');
        const { data: logs, error: logError } = await supabase
            .from('email_logs')
            .select('*')
            .eq('recipient_email', testEmail)
            .eq('email_type', 'payment_reminder')
            .order('sent_at', { ascending: false })
            .limit(1);

        if (logError) throw logError;

        if (logs && logs.length > 0) {
            console.log('✅ SUCCESS: Email log found!', logs[0]);
        } else {
            console.error('❌ FAILURE: No email log found.');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        // 4. Cleanup
        console.log('🧹 Cleaning up mock data...');
        await supabase.from('razorpay_ledger').delete().eq('payment_id', testPaymentId);
        await supabase.from('email_logs').delete().eq('recipient_email', testEmail);
        console.log('✨ Cleanup complete.');
    }
}

runTest();
