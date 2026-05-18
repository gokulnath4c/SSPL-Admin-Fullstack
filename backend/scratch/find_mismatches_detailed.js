const excelData = require('./master_data_captured.json');
require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function findMismatches() {
    const excelIds = excelData.map(d => d.id);
    console.log(`Checking ${excelIds.length} captured transactions from Excel...`);

    const dbPayments = new Map();
    const CHUNK_SIZE = 100;
    
    for (let i = 0; i < excelIds.length; i += CHUNK_SIZE) {
        const chunk = excelIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('payment_id, status')
            .in('payment_id', chunk);

        if (error) {
            console.error('Error fetching from DB:', error);
            continue;
        }

        data.forEach(r => dbPayments.set(r.payment_id, r.status));
    }

    const mismatches = [];
    excelData.forEach(tx => {
        const dbStatus = dbPayments.get(tx.id);
        if (!dbStatus) {
            // Not in DB at all (we already checked this but let's be thorough)
            mismatches.push({ ...tx, mismatch: 'Missing in DB' });
        } else if (dbStatus !== 'captured') {
            // Status mismatch
            mismatches.push({ ...tx, mismatch: `Status Mismatch: Excel(captured) vs DB(${dbStatus})` });
        }
    });

    console.log(`Found ${mismatches.length} mismatches in Status/Presence.`);
    
    if (mismatches.length > 0) {
        mismatches.forEach(m => {
            console.log('--- MISMATCH ---');
            console.log(`ID: ${m.id}`);
            console.log(`Mismatch: ${m.mismatch}`);
            console.log(`Email: ${m.email}`);
            console.log(`Contact: ${m.contact}`);
            console.log('----------------');
        });
    }

    // Now let's check player_registrations
    console.log('\nChecking if they exist in player_registrations...');
    const registrationMismatches = [];
    
    for (let i = 0; i < excelIds.length; i += CHUNK_SIZE) {
        const chunk = excelIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
            .from('player_registrations')
            .select('razorpay_payment_id, payment_status')
            .in('razorpay_payment_id', chunk);

        if (error) continue;
        
        const regIds = new Set(data.map(r => r.razorpay_payment_id));
        
        chunk.forEach(id => {
            if (!regIds.has(id)) {
                registrationMismatches.push(id);
            }
        });
    }

    console.log(`Found ${registrationMismatches.length} captured payments NOT linked to registrations.`);
    if (registrationMismatches.length > 0 && registrationMismatches.length < 100) {
        console.log('Orphaned Payment IDs:', registrationMismatches);
    }
}

findMismatches();
