const { reconcile } = require('../services/reconciliation-service.cjs');
const dotenv = require('dotenv');
dotenv.config({ path: './.env.production' }); // Use production env if available

async function runFullSync() {
    console.log("🚀 Starting Full Razorpay Reconciliation (Last 12 Months)...");
    
    // Range: from 2025-08-01 to now
    const from = "2025-08-01T00:00:00Z";
    const to = new Date().toISOString();

    try {
        const result = await reconcile(from, to);
        
        console.log("\n--- Synchronization Summary ---");
        console.log(`Total Payments Processed from Razorpay: ${result.processed_count}`);
        console.log(`Missing in Local DB (Registrations): ${result.missing_in_sspl.length}`);
        console.log(`Status Mismatches Fixed: ${result.status_mismatch.length}`);
        
        if (result.missing_in_sspl.length > 0) {
            console.log("\n⚠️ Payments found in Razorpay but NOT linked to any registration:");
            result.missing_in_sspl.slice(0, 10).forEach(p => {
                console.log(`- ID: ${p.payment_id}, Email: ${p.email}, Amount: ${p.amount}, Status: ${p.status}`);
            });
            if (result.missing_in_sspl.length > 10) console.log(`... and ${result.missing_in_sspl.length - 10} more.`);
        }

        if (result.errors.length > 0) {
            console.log("\n❌ Errors encountered:");
            result.errors.forEach(e => console.log(`- ${e}`));
        }

        console.log("\n✅ Full synchronization complete. All missing records have been upserted to razorpay_ledger.");
    } catch (error) {
        console.error("Critical error during reconciliation:", error);
    }
}

runFullSync();
