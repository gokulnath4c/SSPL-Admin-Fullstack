require('dotenv').config({ path: __dirname + '/../.env.production' });
const { checkAndSendReminders } = require('../cron/payment-reminders.cjs');

async function runManualTrigger() {
    console.log('🚀 Starting Manual Reminder Trigger (Last 24 Hours)...');

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    // End time is "now" minus a small buffer (e.g. 30 mins) to respect the "give them time to pay" rule, 
    // or just "now" if we assume 30 mins buffer is strictly for the automated run. 
    // The user said "failed payments for past 24 hours". 
    // Let's stick to the safety rule: don't email people who just failed 1 minute ago, they might be retrying.
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

    console.log(`📅 Window: ${twentyFourHoursAgo} to ${thirtyMinutesAgo}`);

    await checkAndSendReminders(twentyFourHoursAgo, thirtyMinutesAgo);

    console.log('✅ Manual Trigger Complete.');
    process.exit(0);
}

runManualTrigger();
