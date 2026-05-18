import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData(phone) {
    console.log(`Checking data for phone: ${phone}`);
    
    // Check player_registrations
    const { data: regs, error: regError } = await supabase
        .from('player_registrations')
        .select('*')
        .ilike('phone', `%${phone}%`);
    
    if (regError) {
        console.error('Error fetching registrations:', regError);
    } else {
        console.log(`Found ${regs.length} registrations:`);
        regs.forEach(r => {
            console.log(`- ID: ${r.id}, Name: ${r.full_name}, Created At: ${r.created_at}, Status: ${r.payment_status}, Razorpay ID: ${r.razorpay_payment_id}`);
        });
    }

    // Check razorpay_ledger by payment_id
    const paymentId = 'pay_SlkFXRebrrdoYF';
    const { data: ledgerById, error: ledgerByIdError } = await supabase
        .from('razorpay_ledger')
        .select('*')
        .eq('payment_id', paymentId);
    
    if (ledgerByIdError) {
        console.error('Error fetching ledger by ID:', ledgerByIdError);
    } else {
        console.log(`Found ${ledgerById.length} ledger entries for ID ${paymentId}:`);
        ledgerById.forEach(l => {
            console.log(`- Payment ID: ${l.payment_id}, Amount: ${l.amount}, Status: ${l.status}, Email: ${l.email}, Contact: ${l.contact}`);
        });
    }
}

const phone = '7760576699';
checkData(phone);
