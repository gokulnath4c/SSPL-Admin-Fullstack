const XLSX = require('xlsx');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

async function fixOrphanedLinks() {
    console.log('Starting bulk link of orphaned captured payments...');

    // 1. Fetch all 'captured' payments from ledger
    let allCaptured = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('payment_id, email, contact, amount, created_at')
            .eq('status', 'captured')
            .range(page * PAGE_SIZE, (page * PAGE_SIZE) + PAGE_SIZE - 1);

        if (error) break;
        if (data.length > 0) {
            allCaptured = [...allCaptured, ...data];
            page++;
            if (data.length < PAGE_SIZE) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    console.log(`Total captured in ledger: ${allCaptured.length}`);

    // 2. Index ledger by email and normalized phone
    const normalize = (num) => {
        if (!num) return null;
        let s = String(num).replace(/\D/g, '');
        if (s.startsWith('91') && s.length > 10) s = s.substring(2);
        return s;
    };

    // 3. Fetch all registrations that are 'pending' OR missing a payment ID
    const { data: pendingRegs, error: pError } = await supabase
        .from('player_registrations')
        .select('id, email, phone, razorpay_payment_id, payment_status')
        .or('payment_status.eq.pending,razorpay_payment_id.is.null');

    if (pError) {
        console.error('Error fetching registrations:', pError);
        return;
    }

    console.log(`Potential registrations to link: ${pendingRegs.length}`);

    const emailToPayment = new Map();
    const phoneToPayment = new Map();

    allCaptured.forEach(p => {
        if (p.email) emailToPayment.set(p.email.toLowerCase(), p);
        const m = normalize(p.contact);
        if (m) phoneToPayment.set(m, p);
    });

    let linkCount = 0;
    for (const reg of pendingRegs) {
        // Find a matching payment
        let match = emailToPayment.get(reg.email.toLowerCase());
        if (!match) {
            const m = normalize(reg.phone);
            if (m) match = phoneToPayment.get(m);
        }

        if (match && reg.razorpay_payment_id !== match.payment_id) {
            console.log(`Linking Reg ${reg.id} to Payment ${match.payment_id} (${match.email})`);
            
            const { error: uError } = await supabase
                .from('player_registrations')
                .update({
                    razorpay_payment_id: match.payment_id,
                    payment_status: 'captured',
                    updated_at: new Date().toISOString()
                })
                .eq('id', reg.id);

            if (!uError) linkCount++;
            else console.error(`Failed to link ${reg.id}:`, uError.message);
        }
    }

    console.log(`\nSuccessfully linked ${linkCount} orphaned registrations.`);
}

fixOrphanedLinks();
