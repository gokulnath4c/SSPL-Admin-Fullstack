const supabase = require('../config/supabase.cjs');
const { fetchAllPayments } = require('./razorpay-service.cjs');

// Helper to map Razorpay payment to Ledger Schema (Duplicated from backfill, could be shared util)
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

async function reconcile(from, to) {
    console.log(`Reconciling from ${from} to ${to}...`);
    const results = {
        missing_in_sspl: [],
        status_mismatch: [],
        processed_count: 0,
        errors: []
    };

    try {
        // 1. Fetch from Razorpay API for the range
        // Razorpay inputs are timestamps (seconds)
        const fromTimestamp = from ? Math.floor(new Date(from).getTime() / 1000) : undefined;
        const toTimestamp = to ? Math.floor(new Date(to).getTime() / 1000) : undefined;

        // Fetch all payments in this range (using loop similar to backfill)
        let hasMore = true;
        let skip = 0;
        const count = 100;
        let allRazorpayPayments = [];

        while (hasMore) {
            const payments = await fetchAllPayments({ from: fromTimestamp, to: fromTimestamp ? toTimestamp : undefined, count, skip });
            allRazorpayPayments = [...allRazorpayPayments, ...payments];
            if (payments.length < count) hasMore = false;
            else skip += count;
            // Safety break for very large ranges in one go, or rely on pagination
            if (skip > 10000) {
                console.warn('Reconciliation limit reached (10k items), stopping fetch.');
                hasMore = false;
            }
        }

        results.processed_count = allRazorpayPayments.length;
        console.log(`Fetched ${allRazorpayPayments.length} payments from Razorpay.`);

        if (allRazorpayPayments.length === 0) return results;

        // 2. Upsert into Ledger (Ensure 'Insert missing records only into razorpay_ledger' requirement)
        const ledgerRecords = allRazorpayPayments.map(mapPaymentToSchema);

        console.log(`Attempting to upsert ${ledgerRecords.length} records to razorpay_ledger...`);
        console.log('Sample record:', JSON.stringify(ledgerRecords[0], null, 2));

        const { data: upsertData, error: ledgerError } = await supabase
            .from('razorpay_ledger')
            .upsert(ledgerRecords, { onConflict: 'payment_id' })
            .select();

        if (ledgerError) {
            console.error('Ledger upsert error:', ledgerError);
            results.errors.push('Failed to update ledger: ' + ledgerError.message);
        } else {
            console.log(`Successfully upserted ${upsertData?.length || 0} records to razorpay_ledger`);
        }

        // 3. Compare with SSPL (player_registrations)
        // We can't fetch all registrations, so we query by payment_ids found
        // If list is huge, chunk it. Supabase `in` filter limit ~65k params, but safe chunk size 100.

        const chunkSize = 100;
        for (let i = 0; i < allRazorpayPayments.length; i += chunkSize) {
            const chunk = allRazorpayPayments.slice(i, i + chunkSize);
            const paymentIds = chunk.map(p => p.id);

            // Query registrations where razorpay_payment_id IS IN chunk
            const { data: registrations, error: ssplError } = await supabase
                .from('player_registrations')
                .select('razorpay_payment_id, payment_status, id')
                .in('razorpay_payment_id', paymentIds);

            if (ssplError) {
                console.error('SSPL fetch error:', ssplError);
                results.errors.push(ssplError.message);
                continue;
            }

            const ssplMap = new Map(registrations.map(r => [r.razorpay_payment_id, r]));

            for (const payment of chunk) {
                const ssplRecord = ssplMap.get(payment.id);

                if (!ssplRecord) {
                    // Missing in SSPL
                    // Exclude 'failed' or 'created' payments if they are not expected to be in SSPL?
                    // Usually only captured/authorized should be there.
                    // But requirement says "Detect Missing transactions".
                    if (payment.status === 'captured' || payment.status === 'authorized') {
                        results.missing_in_sspl.push({
                            payment_id: payment.id,
                            amount: payment.amount / 100,
                            status: payment.status,
                            email: payment.email
                        });
                    }
                } else {
                    // Check Status Mismatch
                    // Razorpay: 'captured' -> SSPL: 'completed' (usually)
                    // Razorpay: 'created' -> SSPL: 'pending'
                    const rzpStatus = payment.status;
                    const ssplStatus = ssplRecord.payment_status;

                    let mismatch = false;
                    if (rzpStatus === 'captured' && (ssplStatus !== 'completed' && ssplStatus !== 'captured')) mismatch = true;
                    if (rzpStatus === 'failed' && ssplStatus !== 'failed') mismatch = true;

                    if (mismatch) {
                        console.log(`Fixing mismatch for payment ${payment.id}: RZP(${rzpStatus}) vs DB(${ssplStatus})`);
                        
                        const updateData = {};
                        if (rzpStatus === 'captured') {
                            updateData.payment_status = 'captured';
                            updateData.amount_paid = payment.amount / 100;
                            updateData.status = 'paid'; 
                        } else if (rzpStatus === 'failed') {
                            updateData.payment_status = 'failed';
                        }

                        if (Object.keys(updateData).length > 0) {
                            const { error: updateError } = await supabase
                                .from('player_registrations')
                                .update(updateData)
                                .eq('razorpay_payment_id', payment.id);

                            if (updateError) {
                                console.error(`Failed to update ${payment.id}:`, updateError);
                                results.errors.push(`Update failed for ${payment.id}: ${updateError.message}`);
                            } else {
                                results.fixed_count = (results.fixed_count || 0) + 1;
                            }
                        }

                        results.status_mismatch.push({
                            payment_id: payment.id,
                            razorpay_status: rzpStatus,
                            sspl_status: ssplStatus,
                            registration_id: ssplRecord.id,
                            fixed: !results.errors.some(e => e.includes(payment.id))
                        });
                    }
                }
            }
        }

    } catch (error) {
        console.error('Reconciliation error:', error);
        results.errors.push(error.message);
    }

    return results;
}

module.exports = {
    reconcile
};
