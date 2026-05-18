const supabase = require('../config/supabase.cjs');
const { fetchAllPayments } = require('./razorpay-service.cjs');

function mapPaymentToSchema(payment) {
    return {
        payment_id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount ? payment.amount / 100 : 0,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        fee: payment.fee ? payment.fee / 100 : null,
        tax: payment.tax ? payment.tax / 100 : null,
        created_at: new Date(payment.created_at * 1000).toISOString(),
        captured_at: payment.captured ? new Date(payment.created_at * 1000).toISOString() : null,
        raw_payload: payment,
        last_synced_at: new Date().toISOString()
    };
}

async function runBackfill() {
    console.log('Starting Razorpay backfill...');
    let totalFetched = 0;
    let totalInserted = 0;
    let hasMore = true;
    let skip = 0;
    const count = 100;

    try {
        while (hasMore) {
            console.log(`Fetching payments (skip: ${skip}, count: ${count})...`);
            const payments = await fetchAllPayments({ count, skip });

            if (payments.length === 0) {
                hasMore = false;
                break;
            }

            totalFetched += payments.length;

            const records = payments.map(mapPaymentToSchema);

            // Upsert into Supabase
            const { error } = await supabase
                .from('razorpay_ledger')
                .upsert(records, { onConflict: 'payment_id' });

            if (error) {
                console.error('Error inserting batch into Supabase:', error);
            } else {
                totalInserted += payments.length;
            }

            console.log(`Processed ${totalInserted} / ${totalFetched} payments...`);

            if (payments.length < count) {
                hasMore = false;
            } else {
                skip += count;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('✅ Backfill completed successfully.');
        return { success: true, totalFetched, totalInserted };

    } catch (error) {
        console.error('Backfill failed:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    runBackfill
};
