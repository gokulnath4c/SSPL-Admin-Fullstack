const excelData = require('./master_data_captured.json');
require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function findSymmetricDifference() {
    const excelIds = new Set(excelData.map(d => d.id));
    
    // Fetch all captured from DB till 13-04-2026
    let dbIds = new Set();
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('payment_id')
            .eq('status', 'captured')
            .lte('created_at', '2026-04-13T23:59:59Z')
            .range(page * PAGE_SIZE, (page * PAGE_SIZE) + PAGE_SIZE - 1);

        if (error) break;

        if (data.length > 0) {
            data.forEach(r => dbIds.add(r.payment_id));
            page++;
            if (data.length < PAGE_SIZE) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    console.log(`Excel count: ${excelIds.size}`);
    console.log(`DB count: ${dbIds.size}`);

    const inExcelNotDB = [...excelIds].filter(id => !dbIds.has(id));
    const inDBNotExcel = [...dbIds].filter(id => !excelIds.has(id));

    console.log(`\nIn Excel but NOT in DB (${inExcelNotDB.length}):`, inExcelNotDB);
    console.log(`In DB but NOT in Excel (${inDBNotExcel.length}):`, inDBNotExcel);
    
    if (inExcelNotDB.length > 0) {
        console.log('\nDetails of items in Excel not in DB:');
        excelData.filter(d => inExcelNotDB.includes(d.id)).forEach(d => {
            console.log(`ID: ${d.id}, Amount: ${d.amount}, Email: ${d.email}, Date: ${new Date((d.created_at - 25569) * 86400 * 1000).toISOString()}`);
        });
    }
}

findSymmetricDifference();
