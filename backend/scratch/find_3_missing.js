const excelData = require('./master_data_captured.json');
require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function find3Missing() {
    const excelIds = excelData.map(d => d.id);
    console.log(`Comparing ${excelIds.length} captured IDs from Excel...`);

    const dbIds = new Set();
    const CHUNK_SIZE = 100;
    
    for (let i = 0; i < excelIds.length; i += CHUNK_SIZE) {
        const chunk = excelIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('payment_id')
            .in('payment_id', chunk);

        if (error) {
            console.error('Error fetching from DB:', error);
            continue;
        }

        data.forEach(r => dbIds.add(r.payment_id));
    }

    const missingInDB = excelData.filter(d => !dbIds.has(d.id));
    
    console.log(`Found ${missingInDB.length} missing transactions in Database.`);
    
    if (missingInDB.length > 0) {
        console.log('\n--- MISSING TRANSACTIONS ---');
        missingInDB.slice(0, 10).forEach(tx => {
            console.log(`Payment ID: ${tx.id}`);
            console.log(`Amount: ${tx.amount}`);
            console.log(`Email: ${tx.email}`);
            console.log(`Contact: ${tx.contact}`);
            console.log(`Created At: ${tx.created_at}`);
            console.log('---------------------------');
        });
    } else {
        console.log('No missing transactions found.');
    }
}

find3Missing();
