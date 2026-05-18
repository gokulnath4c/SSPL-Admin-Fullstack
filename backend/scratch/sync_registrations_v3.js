require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

async function syncAll() {
    console.log('--- Starting Bulk Payment Status Sync ---');

    // 1. Helper for normalization
    const normalize = (num) => {
        if (!num) return '';
        let s = String(num).replace(/\D/g, '');
        if (s.startsWith('91') && s.length > 10) s = s.substring(2);
        return s.slice(-10);
    };

    // 2. Fetch all captured payments from ledger
    let allCaptured = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE = 1000;

    console.log('Fetching captured payments from ledger...');
    while (hasMore) {
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('payment_id, email, contact, amount, captured_at')
            .eq('status', 'captured')
            .range(page * PAGE_SIZE, (page * PAGE_SIZE) + PAGE_SIZE - 1);
        
        if (error) {
            console.error('Error fetching ledger:', error);
            break;
        }
        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            allCaptured = [...allCaptured, ...data];
            page++;
        }
    }

    console.log(`Found ${allCaptured.length} captured payments in ledger.`);

    let fixedCount = 0;
    let errorCount = 0;

    // 3. Process in chunks to avoid overwhelming the DB
    const CHUNK_SIZE = 50;
    for (let i = 0; i < allCaptured.length; i += CHUNK_SIZE) {
        const chunk = allCaptured.slice(i, i + CHUNK_SIZE);
        
        await Promise.all(chunk.map(async (payment) => {
            const phone = normalize(payment.contact);
            const email = String(payment.email || '').toLowerCase();
            
            if (!phone && !email) return;

            // Try to update registrations that match this user but ARE NOT marked captured
            let matchQuery = supabase
                .from('player_registrations')
                .update({
                    payment_status: 'captured',
                    status: 'paid',
                    razorpay_payment_id: payment.payment_id,
                    amount_paid: payment.amount
                })
                .neq('payment_status', 'captured'); // Only update those that need it

            if (phone && email) {
                matchQuery = matchQuery.or(`phone.ilike.%${phone}%,email.ilike.%${email}%`);
            } else if (phone) {
                matchQuery = matchQuery.ilike('phone', `%${phone}%`);
            } else {
                matchQuery = matchQuery.eq('email', email);
            }

            const { data, error, count } = await matchQuery.select();

            if (error) {
                if (errorCount < 5) console.error(`Error updating for ${payment.payment_id}:`, error.message, error.details, error.hint);
                errorCount++;
            } else if (data && data.length > 0) {
                fixedCount += data.length;
                console.log(`Fixed ${data.length} registrations for ${email || phone} (${payment.payment_id})`);
            }
        }));

        if (i % 500 === 0) console.log(`Processed ${i} / ${allCaptured.length}...`);
    }

    console.log('\n--- Sync Complete ---');
    console.log(`Total Registrations Updated: ${fixedCount}`);
    console.log(`Errors encountered: ${errorCount}`);
}

syncAll();
