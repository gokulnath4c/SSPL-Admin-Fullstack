require('dotenv').config({ path: __dirname + '/../.env.production' });
const { reconcile } = require('../services/reconciliation-service.cjs');

async function runManualSync() {
    console.log('🚀 Starting Manual Razorpay Reconciliation for Jan 18, 2026...');

    // Target Date: 18th Jan 2026
    // Using UTC day to match standard reconciliation logic
    const from = '2026-01-18T00:00:00Z';
    const to = '2026-01-18T23:59:59Z';

    try {
        const result = await reconcile(from, to);
        console.log('✅ Manual Sync Completed:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Manual Sync Failed:', error);
    }
}

runManualSync();
