const XLSX = require('xlsx');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

async function exhaustiveSearch() {
    const workbook = XLSX.readFile('C:/Users/ADMIN/Downloads/Master Data_SSPL as on 13-04-2026.xlsx');
    const allIdsInExcel = new Set();
    const capturedIdsInExcel = new Set();

    console.log('Scanning all sheets...');
    workbook.SheetNames.forEach(name => {
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
        data.forEach(d => {
            const id = d.id || d['Payment ID'] || d.payment_id;
            if (id && typeof id === 'string' && id.startsWith('pay_')) {
                allIdsInExcel.add(id);
                if (d.status === 'captured') capturedIdsInExcel.add(id);
            }
        });
    });

    console.log(`Total unique IDs found in Excel across all sheets: ${allIdsInExcel.size}`);
    console.log(`Total unique captured IDs found in Excel across all sheets: ${capturedIdsInExcel.size}`);

    // Check against DB ledger
    const ledgerIds = new Set();
    const { data: dbLedger } = await supabase.from('razorpay_ledger').select('payment_id');
    if (dbLedger) dbLedger.forEach(r => ledgerIds.add(r.payment_id));
    
    console.log(`Total unique IDs in DB Ledger: ${ledgerIds.size}`);

    const missingInLedger = [...allIdsInExcel].filter(id => !ledgerIds.has(id));
    console.log(`IDs in Excel but NOT in DB Ledger: ${missingInLedger.length}`);

    // Check against player_registrations
    const regIds = new Set();
    const { data: dbReg } = await supabase.from('player_registrations').select('razorpay_payment_id').not('razorpay_payment_id', 'is', 'null');
    if (dbReg) dbReg.forEach(r => regIds.add(r.razorpay_payment_id));
    
    console.log(`Total unique IDs linked in Player Registrations: ${regIds.size}`);

    const missingInReg = [...capturedIdsInExcel].filter(id => !regIds.has(id));
    console.log(`Captured IDs in Excel but NOT in Registrations (Orphaned): ${missingInReg.length}`);

    // The user said 3 MISMATCHING captured transactions.
    // What if there are 3 IDs in the Excel that have status 'captured' but in DB ledger they are NOT captured?
    const { data: nonCapturedInLedger } = await supabase.from('razorpay_ledger').select('payment_id, status').neq('status', 'captured');
    const nonCapturedMap = new Map(nonCapturedInLedger.map(r => [r.payment_id, r.status]));
    
    const statusMismatches = [];
    capturedIdsInExcel.forEach(id => {
        if (nonCapturedMap.has(id)) {
            statusMismatches.push({ id, excel: 'captured', db: nonCapturedMap.get(id) });
        }
    });
    
    console.log(`Status mismatches found (Excel captured vs DB non-captured): ${statusMismatches.length}`);
    if (statusMismatches.length > 0) {
        console.table(statusMismatches);
    }

    if (missingInLedger.length > 0 && missingInLedger.length < 10) {
        console.log('Missing IDs in Ledger:', missingInLedger);
    }
}

exhaustiveSearch();
