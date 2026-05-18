const excelData = require('./razorpay_data.json'); // This has the first 100
require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function findMismatches() {
    const excelIds = excelData.map(d => d.id);
    
    const { data: dbRecords, error } = await supabase
        .from('razorpay_ledger')
        .select('payment_id')
        .in('payment_id', excelIds);

    if (error) {
        console.error(error);
        return;
    }

    const dbIds = new Set(dbRecords.map(r => r.payment_id));
    const missing = excelIds.filter(id => !dbIds.has(id));

    console.log('Sample IDs in Excel but missing in DB (from first 100):');
    console.log(missing);
}

findMismatches();
