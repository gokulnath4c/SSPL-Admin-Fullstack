require('dotenv').config({ path: __dirname + '/../.env.production' });
const { fetchAllPayments } = require('../services/razorpay-service.cjs');
const supabase = require('../config/supabase.cjs');

const START_DATE = '2025-06-22T00:00:00Z';

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

async function runDateBackfill() {
    const fromTimestamp = Math.floor(new Date(START_DATE).getTime() / 1000);
    console.log(`🚀 Starting Backfill from ${START_DATE} (Epoch: ${fromTimestamp})...`);

    let totalFetched = 0;
    let totalInserted = 0;
    let hasMore = true;
    let skip = 0;
    const count = 100;

    try {
        while (hasMore) {
            console.log(`Fetching batch (skip: ${skip}, count: ${count})...`);

            // Pass 'from' filter to Razorpay
            const payments = await fetchAllPayments({
                count,
                skip,
                from: fromTimestamp
            });

            if (payments.length === 0) {
                console.log('No more payments found.');
                hasMore = false;
                break;
            }

            totalFetched += payments.length;
            const records = payments.map(mapPaymentToSchema);

            const { error } = await supabase
                .from('razorpay_ledger')
                .upsert(records, { onConflict: 'payment_id' });

            if (error) {
                console.error('Error inserting batch:', error);
            } else {
                totalInserted += payments.length;
            }

            console.log(`Processed ${totalInserted} payments so far...`);

            if (payments.length < count) {
                hasMore = false;
            } else {
                skip += count;
            }

            // Rate limit safety
            await new Promise(r => setTimeout(r, 300));
        }

        console.log(`✅ Backfill Complete. Total: ${totalInserted}`);

    } catch (error) {
        console.error('Backfill failed:', error);
    }
}

runDateBackfill();
