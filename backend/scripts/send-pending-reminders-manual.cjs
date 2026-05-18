require('dotenv').config({ path: __dirname + '/../.env.production' });
const { checkAndSendReminders } = require('../cron/payment-reminders.cjs');

async function runManualReminders() {
    console.log('🚀 Starting Manual Payment Reminder Run...');

    // Look back 3 days (72 hours)
    // We want to catch anyone who registered recently but hasn't paid.
    // The cron usually checks 30-90 mins ago.
    // We will check 3 days ago up to 30 mins ago.

    const now = new Date();
    const endTime = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // Up to 30 mins ago
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // From 24 hours ago

    console.log(`📅 Time Window: ${startTime} to ${endTime}`);

    await checkAndSendReminders(startTime, endTime);

    console.log('✅ Manual run complete.');
    process.exit(0);
}

runManualReminders();
