import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findMissing() {
    console.log("Searching for registrations with payment but missing in ledger...");

    let allRegs = [];
    let hasMoreRegs = true;
    let page = 0;
    const PAGE_SIZE = 1000;

    while (hasMoreRegs) {
        const { data: regs, error: regError } = await supabase
            .from('player_registrations')
            .select('id, full_name, phone, payment_status, razorpay_payment_id, created_at')
            .in('payment_status', ['captured', 'completed', 'paid', 'success', 'success'])
            .not('razorpay_payment_id', 'is', null)
            .range(page * PAGE_SIZE, (page * PAGE_SIZE) + PAGE_SIZE - 1);

        if (regError) {
            console.error('Error fetching registrations:', regError);
            break;
        }

        if (regs && regs.length > 0) {
            allRegs = [...allRegs, ...regs];
            page++;
            if (regs.length < PAGE_SIZE) hasMoreRegs = false;
        } else {
            hasMoreRegs = false;
        }
    }

    console.log(`Found ${allRegs.length} paid registrations in total.`);

    const missing = [];
    const chunkSize = 100;
    for (let i = 0; i < allRegs.length; i += chunkSize) {
        const chunk = allRegs.slice(i, i + chunkSize);
        const paymentIds = chunk.map(r => r.razorpay_payment_id).filter(id => id && id !== 'null' && id !== '');
        
        if (paymentIds.length === 0) continue;

        const { data: ledger, error: ledgerError } = await supabase
            .from('razorpay_ledger')
            .select('payment_id')
            .in('payment_id', paymentIds);

        if (ledgerError) {
            console.error('Error fetching ledger chunk:', ledgerError);
            continue;
        }

        const ledgerIds = new Set(ledger.map(l => l.payment_id));
        
        chunk.forEach(r => {
            if (!ledgerIds.has(r.razorpay_payment_id)) {
                missing.push(r);
            }
        });
    }

    console.log(`\nFound ${missing.length} missing ledger entries:`);
    missing.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    missing.forEach(m => {
        console.log(`- Date: ${m.created_at}, Name: ${m.full_name}, Phone: ${m.phone}, Payment ID: ${m.razorpay_payment_id}`);
    });
}

findMissing();
