require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function debugUser(email) {
    console.log(`🔍 Debugging user: ${email}`);

    // 1. Check Player Registrations
    const { data: regs, error: regError } = await supabase
        .from('player_registrations')
        .select('*')
        .eq('email', email);

    if (regError) console.error('Reg Error:', regError);
    console.log('--- Player Registrations ---');
    if (regs && regs.length > 0) {
        regs.forEach(r => {
            console.log(`ID: ${r.id}, Status: ${r.payment_status}, CreatedAt: ${r.created_at}`);
        });
    } else {
        console.log('No registration records found.');
    }

    // 2. Check Razorpay Ledger
    const { data: ledger, error: ledgerError } = await supabase
        .from('razorpay_ledger')
        .select('*')
        .eq('email', email);

    if (ledgerError) console.error('Ledger Error:', ledgerError);
    console.log('--- Razorpay Ledger ---');
    if (ledger && ledger.length > 0) {
        ledger.forEach(l => {
            console.log(`ID: ${l.payment_id}, Status: ${l.status}, CreatedAt: ${l.created_at}`);
        });
    } else {
        console.log('No ledger records found.');
    }

    // 3. Check Email Logs
    const { data: logs, error: logError } = await supabase
        .from('email_logs')
        .select('*')
        .eq('recipient_email', email);

    if (logError) console.error('Log Error:', logError);
    console.log('--- Email Logs ---');
    if (logs && logs.length > 0) {
        logs.forEach(l => {
            console.log(`Type: ${l.email_type}, SentAt: ${l.sent_at}, Status: ${l.status}`);
        });
    } else {
        console.log('No email logs found.');
    }
}

debugUser('babupuli32@gmail.com');
