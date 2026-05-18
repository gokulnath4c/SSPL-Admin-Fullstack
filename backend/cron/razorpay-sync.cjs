const cron = require('node-cron');
const { reconcile } = require('../services/reconciliation-service.cjs');

// Schedule daily sync at 02:00 AM IST
// Cron format: Minute Hour Day Month DayOfWeek
// 02:00 IST is 20:30 UTC previous day? Cron runs on server time.
// Assuming server is UTC, 02:00 IST = 20:30 UTC.
// If server is IST, it's 2 0 * * *.
// Safe to run it once a day. Let's assume server timezone or just pick a low traffic time.
// Running at 20:30 UTC (02:00 IST).
cron.schedule('30 20 * * *', async () => {
    console.log('⏰ Starting Daily Razorpay Reconciliation...');

    // Reconcile last 3 days to cover any missed webhooks or failed previous runs
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 3);
    const toDate = new Date();
    
    const from = fromDate.toISOString().split('T')[0] + 'T00:00:00Z';
    const to = toDate.toISOString().split('T')[0] + 'T23:59:59Z';

    try {
        const result = await reconcile(from, to);
        console.log('✅ Daily Sync Completed:', result);
    } catch (error) {
        console.error('❌ Daily Sync Failed:', error);
    }
});

console.log('📅 Razorpay Synchronization Job Scheduled (Daily 02:00 IST)');
