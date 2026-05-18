const XLSX = require('xlsx');
const fs = require('fs');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

async function find3Missing() {
    console.log('Reading Master Excel...');
    const workbook = XLSX.readFile('C:/Users/ADMIN/Downloads/Master Data_SSPL as on 13-04-2026.xlsx');
    const masterData = XLSX.utils.sheet_to_json(workbook.Sheets['MASTER RAZORPAY TILL 13-04-2026']);
    
    // 1. Get all captured from Excel that have a registrationId in notes
    const capturedWithReg = masterData.filter(d => 
        d.status === 'captured' && 
        d.notes && 
        d.notes.includes('registrationId')
    ).map(d => {
        try {
            const notes = JSON.parse(d.notes);
            return { id: d.id, regId: notes.registrationId, email: d.email };
        } catch (e) {
            // regex fallback
            const match = d.notes.match(/"registrationId":"([^"]+)"/);
            return { id: d.id, regId: match ? match[1] : null, email: d.email };
        }
    }).filter(d => d.regId);

    console.log(`Checking ${capturedWithReg.length} captured transactions with Registration IDs in notes...`);

    // 2. Check if these links exist in player_registrations
    const CHUNK_SIZE = 100;
    const mismatches = [];

    for (let i = 0; i < capturedWithReg.length; i += CHUNK_SIZE) {
        const chunk = capturedWithReg.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
            .from('player_registrations')
            .select('id, razorpay_payment_id')
            .in('id', chunk.map(c => c.regId));

        if (error) continue;

        const regMap = new Map(data.map(r => [r.id, r.razorpay_payment_id]));

        chunk.forEach(c => {
            const linkedPaymentId = regMap.get(c.regId);
            if (!linkedPaymentId || linkedPaymentId !== c.id) {
                mismatches.push({
                    type: 'Linking Mismatch',
                    excelPaymentId: c.id,
                    excelRegId: c.regId,
                    dbLinkedPaymentId: linkedPaymentId || 'NOT LINKED',
                    email: c.email
                });
            }
        });
    }

    console.log(`Found ${mismatches.length} linking mismatches.`);
    if (mismatches.length > 0) {
        console.log('\n--- POTENTIAL 3 MISSING TRANSACTIONS ---');
        mismatches.slice(0, 10).forEach(m => console.log(JSON.stringify(m, null, 2)));
    }

    // 3. Calculate "Net Failed" manually and show count
    const capturedMobiles = new Set();
    const failedMobiles = new Map(); // Mobile -> List of failed records

    const normalize = (num) => {
        if (!num) return null;
        let s = String(num).replace(/\D/g, '');
        if (s.startsWith('91') && s.length > 10) s = s.substring(2);
        return s;
    };

    masterData.forEach(d => {
        const mobile = normalize(d.contact);
        if (!mobile) return;
        if (d.status === 'captured') {
            capturedMobiles.add(mobile);
        } else if (d.status === 'failed') {
            if (!failedMobiles.has(mobile)) failedMobiles.set(mobile, []);
            failedMobiles.get(mobile).push(d);
        }
    });

    const netFailedNodes = [];
    failedMobiles.forEach((records, mobile) => {
        if (!capturedMobiles.has(mobile)) {
            netFailedNodes.push({ mobile, records });
        }
    });

    console.log(`\nManual Calculation: Net Failed Mobiles: ${netFailedNodes.length}`);
    const excelNetCount = 1166;
    console.log(`Difference with Excel Net Sheet (1166): ${Math.abs(netFailedNodes.length - excelNetCount)}`);

    if (Math.abs(netFailedNodes.length - excelNetCount) < 5) {
        console.log('Calculation matches Excel logic!');
    }
}

find3Missing();
