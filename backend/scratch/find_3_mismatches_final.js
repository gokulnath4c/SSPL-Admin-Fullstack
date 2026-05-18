const XLSX = require('xlsx');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function find3Mismatches() {
    console.log('Reading Master Excel...');
    const workbook = XLSX.readFile('C:/Users/ADMIN/Downloads/Master Data_SSPL as on 13-04-2026.xlsx');
    const masterData = XLSX.utils.sheet_to_json(workbook.Sheets['MASTER RAZORPAY TILL 13-04-2026']);
    
    // Create map of ID -> Status in Excel
    const excelStatusMap = new Map();
    masterData.forEach(d => excelStatusMap.set(d.id, d.status));

    console.log(`Checking ${masterData.length} records...`);

    // 1. Check for IDs in Excel but NOT in Ledger
    const excelIds = [...excelStatusMap.keys()];
    const ledgerIds = new Set();
    const CHUNK_SIZE = 100;
    
    for (let i = 0; i < excelIds.length; i += CHUNK_SIZE) {
        const chunk = excelIds.slice(i, i + CHUNK_SIZE);
        const { data } = await supabase.from('razorpay_ledger').select('payment_id').in('payment_id', chunk);
        if (data) data.forEach(r => ledgerIds.add(r.payment_id));
    }

    const missingInLedger = masterData.filter(d => !ledgerIds.has(d.id) && d.status === 'captured');
    console.log(`Missing in Ledger (Captured): ${missingInLedger.length}`);

    // 2. Check for Status Mismatches (Captured in Excel, not in Ledger)
    const statusMismatches = [];
    for (let i = 0; i < excelIds.length; i += CHUNK_SIZE) {
        const chunk = excelIds.slice(i, i + CHUNK_SIZE);
        const { data } = await supabase.from('razorpay_ledger').select('payment_id, status').in('payment_id', chunk);
        if (data) {
            data.forEach(r => {
                const eStatus = excelStatusMap.get(r.payment_id);
                if (eStatus === 'captured' && r.status !== 'captured') {
                    statusMismatches.push({ id: r.payment_id, excelStatus: eStatus, dbStatus: r.status });
                }
            });
        }
    }
    console.log(`Status Mismatches (Excel Captured vs DB Other): ${statusMismatches.length}`);

    // 3. Check for Captured in DB but FAILED in Excel
    const revMismatches = [];
    // We already know IDs match perfectly from previous run, but let's re-verify logic.
    const dbCaptured = [];
    for (let i = 0; i < excelIds.length; i += CHUNK_SIZE) {
        const chunk = excelIds.slice(i, i + CHUNK_SIZE);
        const { data } = await supabase.from('razorpay_ledger').select('payment_id, status').eq('status', 'captured').in('payment_id', chunk);
        if (data) dbCaptured.push(...data);
    }
    
    dbCaptured.forEach(db => {
        const eStatus = excelStatusMap.get(db.payment_id);
        if (eStatus !== 'captured') {
            revMismatches.push({ id: db.payment_id, dbStatus: db.status, excelStatus: eStatus });
        }
    });
    console.log(`Reverse Mismatches (DB Captured vs Excel Other): ${revMismatches.length}`);

    // 4. Summarize
    if (missingInLedger.length > 0 || statusMismatches.length > 0 || revMismatches.length > 0) {
        console.log('\n--- FINDINGS ---');
        [...missingInLedger, ...statusMismatches, ...revMismatches].forEach(m => console.log(JSON.stringify(m, null, 2)));
    } else {
        console.log('Still no mismatch found in Ledger. Checking player_registrations for specific "captured" counts.');
        const { count: regCapturedCount } = await supabase.from('player_registrations').select('*', { count: 'exact', head: true }).eq('payment_status', 'completed');
        console.log(`Captured in Player Registrations: ${regCapturedCount}`);
        
        // Let's find IDs in Excel Captured but NOT in Registrations
        // (Wait, we know 2313 are orphans).
        // Maybe the user is looking for 3 IDs that are in the Excel Captured BUT their registration is FAILED?
    }
}

find3Mismatches();
