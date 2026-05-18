const excelData = require('./master_data_captured.json');
require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function checkRegistrationMismatches() {
    console.log('Checking for registration status mismatches for 2731 captured payments...');
    
    // We'll check registrations where payment_status IS NOT 'completed' OR 'captured'
    // but the payment_id exists in our captured Excel list.
    
    const excelIds = excelData.map(d => d.id);
    const CHUNK_SIZE = 100;
    const mismatches = [];

    for (let i = 0; i < excelIds.length; i += CHUNK_SIZE) {
        const chunk = excelIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
            .from('player_registrations')
            .select('razorpay_payment_id, payment_status, email, id')
            .in('razorpay_payment_id', chunk);

        if (error) continue;

        data.forEach(reg => {
            if (reg.payment_status !== 'completed' && reg.payment_status !== 'captured') {
                mismatches.push({
                    type: 'Linked but Status Mismatch',
                    regId: reg.id,
                    paymentId: reg.razorpay_payment_id,
                    status: reg.payment_status,
                    email: reg.email
                });
            }
        });
    }

    console.log(`Found ${mismatches.length} registrations linked to these IDs but NOT marked as completed.`);
    if (mismatches.length > 0) {
        console.table(mismatches);
    }

    // Also check for registrations that match by email but have a DIFFERENT payment ID linked
    console.log('\nChecking for registrations matching by email but linked to different payments...');
    
    const emailToExcelPayment = new Map(excelData.map(d => [d.email, d.id]));
    const emailsInExcel = [...emailToExcelPayment.keys()].filter(e => e && e !== '');

    const crossMismatches = [];
    for (let i = 0; i < emailsInExcel.length; i += CHUNK_SIZE) {
        const chunk = emailsInExcel.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
            .from('player_registrations')
            .select('email, razorpay_payment_id, payment_status, id')
            .in('email', chunk);

        if (error) continue;

        data.forEach(reg => {
            const excelPaymentId = emailToExcelPayment.get(reg.email);
            if (reg.razorpay_payment_id && reg.razorpay_payment_id !== excelPaymentId) {
                // Check if the linked payment ID in DB is also captured?
                // For now just log the mismatch.
                crossMismatches.push({
                    regId: reg.id,
                    email: reg.email,
                    dbPaymentId: reg.razorpay_payment_id,
                    excelPaymentId: excelPaymentId,
                    dbStatus: reg.payment_status
                });
            }
        });
    }

    console.log(`Found ${crossMismatches.length} registrations with email matches but DIFFERENT payment IDs.`);
    if (crossMismatches.length > 0 && crossMismatches.length < 50) {
        console.table(crossMismatches);
    }
}

checkRegistrationMismatches();
