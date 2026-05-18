require('dotenv').config({ path: __dirname + '/../.env.production' });
const { reconcile } = require('../services/reconciliation-service.cjs');

async function runFullSync() {
    console.log('🚀 Starting Comprehensive Razorpay Sync...');

    // Synchronizing from the earliest date in the Excel file (plus a buffer)
    const from = '2025-06-01T00:00:00Z';
    const to = new Date().toISOString();

    console.log(`Period: ${from} to ${to}`);

    try {
        const result = await reconcile(from, to);
        console.log('✅ Full Sync Completed!');
        console.log('Summary:');
        console.log(`- Total Processed: ${result.processed_count}`);
        console.log(`- Mismatches Fixed: ${result.fixed_count || 0}`);
        console.log(`- Missing in Database (Synced): ${result.missing_in_sspl?.length || 0}`);
        
        if (result.errors && result.errors.length > 0) {
            console.warn('⚠️ Some errors occurred during sync:', result.errors);
        }
    } catch (error) {
        console.error('❌ Full Sync Failed:', error);
    }
}

runFullSync();
