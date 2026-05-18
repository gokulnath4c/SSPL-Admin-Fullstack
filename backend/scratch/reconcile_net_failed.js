const XLSX = require('xlsx');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

async function check() {
    const wb = XLSX.readFile('C:/Users/ADMIN/Downloads/Netfailed as on 13th April 2026.xlsx');
    const excelData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    const normalize = (num) => {
        if (!num) return '';
        let s = String(num).replace(/\D/g, '');
        if (s.startsWith('91') && s.length > 10) s = s.substring(2);
        return s.slice(-10);
    };

    const normalizeEmail = (e) => String(e || '').toLowerCase().trim();

    console.log('--- Reconciliation Starting ---');

    /* 1. Fetch ALL Captured contacts from DB (current as of now) */
    let capturedPhones = new Set();
    let capturedEmails = new Set();
    let hasMore = true;
    let page = 0;
    while (hasMore) {
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('email, contact')
            .eq('status', 'captured')
            .range(page * 1000, (page * 1000) + 999);
        
        if (error) {
            console.error('Error fetching captured:', error);
            break;
        }
        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            data.forEach(d => {
                if (d.email) capturedEmails.add(normalizeEmail(d.email));
                const p = normalize(d.contact);
                if (p) capturedPhones.add(p);
            });
            page++;
        }
    }

    /* 2. Fetch ALL Failed records from DB */
    let dbFailed = [];
    hasMore = true;
    page = 0;
    while (hasMore) {
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('*')
            .eq('status', 'failed')
            .range(page * 1000, (page * 1000) + 999);
        
        if (error) {
            console.error('Error fetching failed:', error);
            break;
        }
        if (!data || data.length === 0) {
            hasMore = false;
        } else {
            dbFailed = [...dbFailed, ...data];
            page++;
        }
    }

    /* 3. Filter DB Net Failed (those who have NEVER captured) */
    let dbNetFailed = dbFailed.filter(tx => {
        const phone = normalize(tx.contact);
        const email = normalizeEmail(tx.email);
        return !capturedPhones.has(phone) && !capturedEmails.has(email);
    });

    const dbNetFailedCount = dbNetFailed.length;
    console.log(`DB Net Failed Rows (Raw): ${dbNetFailedCount}`);

    /* 4. Compare with Excel */
    // Map of unique identifiers in DB
    const dbKeys = new Set(dbNetFailed.map(tx => normalize(tx.contact) + '|' + normalizeEmail(tx.email)));

    let missingFromDb = [];
    let paidSince = [];
    let duplicateInExcel = 0;
    let seenInExcel = new Set();

    excelData.forEach(row => {
        const phone = normalize(row.CONTACT);
        const email = normalizeEmail(row.EMAIL);
        const key = phone + '|' + email;

        if (seenInExcel.has(key)) {
            // duplicateInExcel++;
        }
        seenInExcel.add(key);

        if (capturedPhones.has(phone) || capturedEmails.has(email)) {
            paidSince.push(row);
        } else if (!dbKeys.has(key)) {
            missingFromDb.push(row);
        }
    });

    console.log('\n--- Match Analysis ---');
    console.log(`Excel Records: ${excelData.length}`);
    console.log(`DB Net Failed Records: ${dbNetFailedCount}`);
    console.log(`Mismatch: ${excelData.length - dbNetFailedCount}`);

    console.log(`\nExcel users who successfully paid since 13th April: ${paidSince.length}`);
    console.log(`Excel records missing from DB failed ledger (not found in DB at all): ${missingFromDb.length}`);

    if (paidSince.length > 0) {
        console.log('\nSample users who paid since (removed from Net Failed):');
        console.log(paidSince.slice(0, 5).map(r => ({ phone: r.CONTACT, email: r.EMAIL })));
    }

    if (missingFromDb.length > 0) {
        console.log('\nSample records missing from DB entirely:');
        console.log(missingFromDb.slice(0, 5));
    }
}

check();
