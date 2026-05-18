/**
 * Full Sync: Fetch ALL transactions from Razorpay (from the very beginning) and
 * upsert them into razorpay_ledger. Also cross-checks player_registrations.
 * 
 * Usage: node scratch/full_sync_all_transactions.js
 */

const { createClient } = require('@supabase/supabase-js');
const Razorpay = require('razorpay');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

function mapPaymentToSchema(payment) {
    return {
        payment_id: payment.id,
        order_id: payment.order_id || null,
        amount: payment.amount ? payment.amount / 100 : 0,
        currency: payment.currency || 'INR',
        status: payment.status,
        method: payment.method || null,
        email: payment.email || null,
        contact: payment.contact || null,
        fee: payment.fee ? payment.fee / 100 : null,
        tax: payment.tax ? payment.tax / 100 : null,
        created_at: new Date(payment.created_at * 1000).toISOString(),
        captured_at: payment.captured ? new Date((payment.authorized_at || payment.created_at) * 1000).toISOString() : null,
        raw_payload: payment,
        last_synced_at: new Date().toISOString()
    };
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPageFromRazorpay(from, to, skip) {
    const params = { count: 100, skip };
    if (from) params.from = from;
    if (to) params.to = to;
    
    try {
        const response = await razorpay.payments.all(params);
        return response.items || [];
    } catch (err) {
        console.error(`  ❌ Razorpay API error (skip=${skip}):`, err.message);
        return [];
    }
}

async function main() {
    console.log('🚀 Starting FULL Razorpay → razorpay_ledger Sync\n');

    // SSPL went live around August 2025 — start from there
    const START_DATE = new Date('2025-08-01T00:00:00Z');
    const END_DATE = new Date(); // now

    // We'll chunk by month to avoid Razorpay API limits
    const months = [];
    let cursor = new Date(START_DATE);
    while (cursor < END_DATE) {
        const next = new Date(cursor);
        next.setMonth(next.getMonth() + 1);
        months.push({
            from: Math.floor(cursor.getTime() / 1000),
            to: Math.floor(Math.min(next.getTime(), END_DATE.getTime()) / 1000),
            label: cursor.toISOString().slice(0, 7)
        });
        cursor = next;
    }

    console.log(`📅 Processing ${months.length} month(s): ${months[0].label} → ${months[months.length - 1].label}\n`);

    let totalFetched = 0;
    let totalUpserted = 0;
    let totalErrors = 0;
    let missingFromRegistrations = [];

    for (const month of months) {
        console.log(`\n📆 === ${month.label} ===`);
        let skip = 0;
        let monthFetched = 0;
        let hasMore = true;

        while (hasMore) {
            const payments = await fetchPageFromRazorpay(month.from, month.to, skip);
            if (payments.length === 0) {
                hasMore = false;
                break;
            }

            monthFetched += payments.length;
            const records = payments.map(mapPaymentToSchema);

            // Upsert batch into razorpay_ledger
            const { error: upsertError } = await supabase
                .from('razorpay_ledger')
                .upsert(records, { onConflict: 'payment_id' });

            if (upsertError) {
                console.error(`  ❌ Upsert error:`, upsertError.message);
                totalErrors++;
            } else {
                totalUpserted += records.length;
                process.stdout.write(`  ✅ Upserted ${skip + records.length} records...\r`);
            }

            // Cross-check captured payments vs player_registrations
            const capturedPayments = payments.filter(p => p.status === 'captured');
            if (capturedPayments.length > 0) {
                const paymentIds = capturedPayments.map(p => p.id);
                const { data: regs } = await supabase
                    .from('player_registrations')
                    .select('razorpay_payment_id, payment_status, full_name, phone')
                    .in('razorpay_payment_id', paymentIds);

                const regMap = new Map((regs || []).map(r => [r.razorpay_payment_id, r]));
                for (const p of capturedPayments) {
                    if (!regMap.has(p.id)) {
                        // Not matched by payment_id — check by phone/email
                        const phone = String(p.contact || '').replace(/\D/g, '').slice(-10);
                        missingFromRegistrations.push({
                            payment_id: p.id,
                            amount: p.amount / 100,
                            contact: p.contact,
                            email: p.email,
                            date: new Date(p.created_at * 1000).toLocaleDateString()
                        });
                    }
                }
            }

            if (payments.length < 100) {
                hasMore = false;
            } else {
                skip += 100;
                await sleep(300); // rate limit courtesy
            }
        }

        totalFetched += monthFetched;
        console.log(`  📊 ${month.label}: ${monthFetched} payments fetched`);
    }

    // Get current ledger count from DB
    const { count: ledgerCount } = await supabase
        .from('razorpay_ledger')
        .select('*', { count: 'exact', head: true });

    const { count: capturedCount } = await supabase
        .from('razorpay_ledger')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'captured');

    const { count: failedCount } = await supabase
        .from('razorpay_ledger')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

    console.log('\n\n========== SYNC COMPLETE ==========');
    console.log(`✅ Total fetched from Razorpay: ${totalFetched}`);
    console.log(`✅ Total upserted to ledger:    ${totalUpserted}`);
    console.log(`❌ Errors:                       ${totalErrors}`);
    console.log('\n--- razorpay_ledger DB State ---');
    console.log(`📦 Total records in ledger:  ${ledgerCount}`);
    console.log(`✅ Captured (paid):          ${capturedCount}`);
    console.log(`❌ Failed:                   ${failedCount}`);

    if (missingFromRegistrations.length > 0) {
        console.log(`\n⚠️  ${missingFromRegistrations.length} CAPTURED payments not found in player_registrations:`);
        missingFromRegistrations.forEach(p => {
            console.log(`   pay_id=${p.payment_id}  ₹${p.amount}  ${p.contact}  ${p.email}  ${p.date}`);
        });
    } else {
        console.log('\n✅ All captured payments are present in player_registrations');
    }
    console.log('====================================\n');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
