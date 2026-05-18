const excelData = require('./master_data_captured.json');
require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function checkAmounts() {
    const excelIds = excelData.map(d => d.id);
    
    const dbPayments = new Map();
    const CHUNK_SIZE = 100;
    
    for (let i = 0; i < excelIds.length; i += CHUNK_SIZE) {
        const chunk = excelIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('payment_id, amount')
            .in('payment_id', chunk);

        if (error) continue;
        data.forEach(r => dbPayments.set(r.payment_id, Number(r.amount)));
    }

    const amountMismatches = [];
    excelData.forEach(tx => {
        const dbAmount = dbPayments.get(tx.id);
        if (dbAmount !== undefined && Math.abs(dbAmount - Number(tx.amount)) > 0.01) {
            amountMismatches.push({
                id: tx.id,
                excelAmount: tx.amount,
                dbAmount: dbAmount,
                email: tx.email
            });
        }
    });

    console.log(`Found ${amountMismatches.length} amount mismatches.`);
    if (amountMismatches.length > 0) {
        console.table(amountMismatches);
    }
}

checkAmounts();
