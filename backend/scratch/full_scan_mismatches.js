const XLSX = require('xlsx');
require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function fullScan() {
    console.log('Scanning all 4855 records for any status mismatch...');
    const workbook = XLSX.readFile('C:/Users/ADMIN/Downloads/Master Data_SSPL as on 13-04-2026.xlsx');
    const masterData = XLSX.utils.sheet_to_json(workbook.Sheets['MASTER RAZORPAY TILL 13-04-2026']);
    
    const excelData = new Map();
    masterData.forEach(d => excelData.set(d.id, d.status));

    const ids = [...excelData.keys()];
    const mismatches = [];
    const CHUNK_SIZE = 100;

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('payment_id, status')
            .in('payment_id', chunk);

        if (error) continue;

        const dbMap = new Map(data.map(r => [r.payment_id, r.status]));
        
        chunk.forEach(id => {
            const eStatus = excelData.get(id);
            const dStatus = dbMap.get(id);

            if (!dStatus) {
                mismatches.push({ id, excel: eStatus, db: 'MISSING' });
            } else if (eStatus !== dStatus) {
                mismatches.push({ id, excel: eStatus, db: dStatus });
            }
        });
    }

    console.log(`Found ${mismatches.length} mismatches.`);
    if (mismatches.length > 0) {
        console.table(mismatches);
    } else {
        console.log('All 4855 records match exactly in status.');
    }
}

fullScan();
