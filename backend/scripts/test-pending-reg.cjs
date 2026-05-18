require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');
const { checkAndSendReminders } = require('../cron/payment-reminders.cjs');

async function runTest() {
    console.log('🧪 Starting Verification Test for Pending Registrations...');
    const testEmail = 'pending_reg_test@example.com';

    try {
        // 1. Setup: Insert Mock Pending Registration (45 mins ago)
        const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();

        console.log('📝 Inserting mock pending registration...');
        const { error: insertError } = await supabase.from('player_registrations').insert({
            full_name: 'Test User',
            email: testEmail,
            phone: '9998887776',
            date_of_birth: '2000-01-01',
            state: 'Maharashtra',
            city: 'Mumbai',
            pincode: '400001',
            position: 'Batsman',
            payment_status: 'pending',
            payment_amount: 500,
            created_at: fortyFiveMinsAgo
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
        await supabase.from('player_registrations').delete().eq('email', testEmail);
        await supabase.from('email_logs').delete().eq('recipient_email', testEmail);
        console.log('✨ Cleanup complete.');
    }
}

runTest();
