const excelData = require('./master_data_captured.json');
require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function findRecent() {
    // Excel dates are serial numbers. 46114 is April 1, 2026? 
    // Let's just convert and filter.
    const excelRecent = excelData.filter(d => {
        const date = new Date((d.created_at - 25569) * 86400 * 1000);
        return date >= new Date('2026-04-01');
    });

    console.log(`Found ${excelRecent.length} captured transactions in Excel from April 2026.`);
    
    if (excelRecent.length === 0) {
        console.log('Sample dates from Excel:', excelData.slice(0, 5).map(d => new Date((d.created_at - 25569) * 86400 * 1000).toISOString()));
        return;
    }

    const excelIds = excelRecent.map(d => d.id);
    const { data: dbRecords, error } = await supabase
        .from('razorpay_ledger')
        .select('payment_id')
        .in('payment_id', excelIds);

    const dbIds = new Set(dbRecords.map(r => r.payment_id));
    const missing = excelRecent.filter(d => !dbIds.has(d.id));

    console.log(`Found ${missing.length} missing transactions from April 2026.`);
    if (missing.length > 0) {
        console.table(missing);
    }
}

findRecent();
