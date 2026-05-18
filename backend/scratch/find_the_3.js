const excelData = require('./master_data_captured.json');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

async function findThe3() {
    const excelIds = new Set(excelData.map(d => d.id));
    
    // Fetch ALL captured from DB
    let allDbCaptured = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('payment_id, email, contact, amount, created_at, status')
            .eq('status', 'captured')
            .range(page * PAGE_SIZE, (page * PAGE_SIZE) + PAGE_SIZE - 1);

        if (error) {
            console.error(error);
            break;
        }

        if (data.length > 0) {
            allDbCaptured = [...allDbCaptured, ...data];
            page++;
            if (data.length < PAGE_SIZE) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    console.log(`Excel Captured (13-04): ${excelIds.size}`);
    console.log(`DB Captured Total: ${allDbCaptured.length}`);

    const extraInDb = allDbCaptured.filter(d => !excelIds.has(d.payment_id));
    console.log(`\nFound ${extraInDb.length} transactions in DB but NOT in Excel:`);
    
    // Filter for those till 13-04
    const cutoff = new Date('2026-04-13T23:59:59Z');
    const missingTill13 = extraInDb.filter(d => new Date(d.created_at) <= cutoff);
    
    console.log(`\n--- THE 3 MISSING TRANSACTIONS (Till April 13) ---`);
    if (missingTill13.length > 0) {
        console.table(missingTill13.map(m => ({
            id: m.payment_id,
            email: m.email,
            amount: m.amount,
            date: m.created_at
        })));
    } else {
        console.log('No missing transactions found before the April 13 cutoff.');
        console.log('Extra after April 13:');
        console.table(extraInDb.filter(d => new Date(d.created_at) > cutoff).map(m => ({
            id: m.payment_id,
            email: m.email,
            date: m.created_at
        })));
    }
}

findThe3();
