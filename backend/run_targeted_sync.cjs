const { reconcile } = require('./services/reconciliation-service.cjs');

async function runSync() {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const from = d.toISOString();
    
    console.log(`Starting automated sync from: ${from}`);
    try {
        const result = await reconcile(from);
        console.log('--- SYNC COMPLETE ---');
        console.log(`Processed: ${result.processed_count}`);
        console.log(`Mismatches Found: ${result.status_mismatch.length}`);
        console.log(`Fixed Count: ${result.fixed_count || 0}`);
        if (result.errors.length > 0) {
            console.log('Errors:', JSON.stringify(result.errors, null, 2));
        }
        process.exit(0);
    } catch (error) {
        console.error('Fatal Sync Error:', error);
        process.exit(1);
    }
}

runSync();
