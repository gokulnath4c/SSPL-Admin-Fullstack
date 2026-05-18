require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function linkPayments() {
    console.log('🔗 Starting link of payments to registrations...');

    let allPayments = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('payment_id, email, contact, amount, status')
            .eq('status', 'captured')
            .range(page * PAGE_SIZE, (page * PAGE_SIZE) + PAGE_SIZE - 1);

        if (error) {
            console.error(error);
            break;
        }

        if (data.length > 0) {
            allPayments = [...allPayments, ...data];
            page++;
            if (data.length < PAGE_SIZE) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    console.log(`Found ${allPayments.length} captured payments in ledger.`);
    let linksCreated = 0;

    // Process in chunks to avoid overwhelming SB/limit
    const CHUNK_SIZE = 50;
    for (let i = 0; i < allPayments.length; i += CHUNK_SIZE) {
        const chunk = allPayments.slice(i, i + CHUNK_SIZE);
        
        await Promise.all(chunk.map(async (p) => {
            if (!p.email && !p.contact) return;

            // Try to find registration by email OR contact
            let query = supabase.from('player_registrations').select('id, razorpay_payment_id, payment_status');
            
            if (p.email && p.contact) {
                query = query.or(`email.eq.${p.email},phone.eq.${p.contact.replace('+91', '')},phone.eq.${p.contact}`);
            } else if (p.email) {
                query = query.eq('email', p.email);
            } else {
                query = query.eq('phone', p.contact);
            }

            const { data: regs, error: rError } = await query;

            if (rError || !regs || regs.length === 0) return;

            for (const reg of regs) {
                // If payment ID is missing or mismatched, update it
                if (!reg.razorpay_payment_id || reg.payment_status !== 'completed') {
                    const { error: uError } = await supabase
                        .from('player_registrations')
                        .update({
                            razorpay_payment_id: p.payment_id,
                            payment_status: 'completed',
                            status: 'approved',
                            payment_amount: p.amount // We might need amount here too
                        })
                        .eq('id', reg.id);

                    if (!uError) linksCreated++;
                }
            }
        }));
        
        if (i % 500 === 0 && i > 0) console.log(`Processed ${i} payments...`);
    }

    console.log(`✅ Linking completed. Created/Updated ${linksCreated} links in player_registrations.`);
}

linkPayments();
