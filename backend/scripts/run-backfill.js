const { runBackfill } = require('../services/backfill-service');

(async () => {
    console.log('🚀 Initiating Manual Backfill...');
    const result = await runBackfill();
    if (result.success) {
        console.log('Backfill finished.');
        process.exit(0);
    } else {
        console.error('Backfill encountered errors.');
        process.exit(1);
    }
})();
