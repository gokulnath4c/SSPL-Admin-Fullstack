const fs = require('fs');
const xlsx = require('xlsx');

// Create a robust parser for CSV since we don't know the exact format and don't want to rely on external libs if not installed
function parseCSV(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    
    const data = [];
    // Super basic CSV parser handling basic quotes
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i];
        let row = {};
        let inQuotes = false;
        let currentValue = '';
        let colIndex = 0;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row[headers[colIndex]] = currentValue.trim();
                currentValue = '';
                colIndex++;
            } else {
                currentValue += char;
            }
        }
        row[headers[colIndex]] = currentValue.trim();
        data.push(row);
    }
    return data;
}

function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '').slice(-10);
}

function normalizeEmail(email) {
    if (!email) return '';
    return String(email).trim().toLowerCase();
}

async function compareFiles() {
    console.log('Reading files...');
    const txFile = 'C:\\Users\\ADMIN\\Downloads\\transactions_2026-05-14 (1).csv';
    const regFile = 'C:\\Users\\ADMIN\\Downloads\\Registrations as on 13.05.26.xlsx';

    // 1. Parse Transactions (CSV)
    const transactions = parseCSV(txFile);
    console.log(`Loaded ${transactions.length} transactions from CSV.`);

    // 2. Parse Registrations (Excel)
    const workbook = xlsx.readFile(regFile);
    const sheetName = workbook.SheetNames[0];
    const registrations = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Loaded ${registrations.length} registrations from Excel.`);

    // 3. Build Maps
    const capturedTransactions = transactions.filter(t => (t.Status || t.status || '').toLowerCase() === 'captured');
    const failedTransactions = transactions.filter(t => (t.Status || t.status || '').toLowerCase() === 'failed');

    const txCapturedByEmail = new Map();
    const txCapturedByPhone = new Map();
    
    capturedTransactions.forEach(tx => {
        const email = normalizeEmail(tx.Email || tx.email);
        const phone = normalizePhone(tx.Contact || tx.contact);
        if (email) txCapturedByEmail.set(email, tx);
        if (phone) txCapturedByPhone.set(phone, tx);
    });

    const txFailedByEmail = new Map();
    const txFailedByPhone = new Map();
    
    failedTransactions.forEach(tx => {
        const email = normalizeEmail(tx.Email || tx.email);
        const phone = normalizePhone(tx.Contact || tx.contact);
        if (email) txFailedByEmail.set(email, tx);
        if (phone) txFailedByPhone.set(phone, tx);
    });

    // 4. Analysis Variables
    let matchCaptured = 0;
    let matchFailedButCapturedInReg = [];
    let matchCreatedButCapturedInReg = [];
    let noMatchInReg = []; // Registrations that have no captured transaction
    
    // Analyze Registrations
    registrations.forEach(reg => {
        // Find email/phone columns flexibly
        const regEmail = normalizeEmail(reg.email || reg.Email || reg['Email ID']);
        const regPhone = normalizePhone(reg.phone || reg.Phone || reg['Mobile Number'] || reg.Contact || reg['whatsapp number']);
        const regStatus = String(reg.payment_status || reg['Payment Status'] || reg.status || '').toLowerCase().trim();

        // Check if registration is marked as paid
        const isPaidInReg = regStatus === 'completed' || regStatus === 'captured' || regStatus === 'paid';
        
        const foundInCaptured = txCapturedByEmail.has(regEmail) || txCapturedByPhone.has(regPhone);
        const foundInFailed = txFailedByEmail.has(regEmail) || txFailedByPhone.has(regPhone);

        if (isPaidInReg) {
            if (foundInCaptured) {
                matchCaptured++;
            } else if (foundInFailed) {
                matchFailedButCapturedInReg.push(reg);
            } else {
                noMatchInReg.push(reg);
            }
        }
    });

    // Analyze Transactions (Are there captured transactions missing in Reg?)
    let missingRegForTx = [];
    const regEmails = new Set(registrations.map(r => normalizeEmail(r.email || r.Email || r['Email ID'])));
    const regPhones = new Set(registrations.map(r => normalizePhone(r.phone || r.Phone || r['Mobile Number'] || r.Contact || r['whatsapp number'])));

    capturedTransactions.forEach(tx => {
        const txEmail = normalizeEmail(tx.Email || tx.email);
        const txPhone = normalizePhone(tx.Contact || tx.contact);
        
        if (!regEmails.has(txEmail) && !regPhones.has(txPhone)) {
            missingRegForTx.push(tx);
        }
    });

    // Print Report
    console.log('\n--- MATCH REPORT ---');
    console.log(`✅ Paid Registrations Matching Captured Transactions: ${matchCaptured}`);
    
    console.log(`\n❌ Paid Registrations but Transaction is FAILED in Razorpay: ${matchFailedButCapturedInReg.length}`);
    if (matchFailedButCapturedInReg.length > 0) {
        matchFailedButCapturedInReg.slice(0, 5).forEach(r => console.log(`   - ${r.full_name || r.Name} (${r.phone || r['Mobile Number']})`));
    }

    console.log(`\n❌ Paid Registrations with NO TRANSACTION found in Razorpay CSV: ${noMatchInReg.length}`);
    if (noMatchInReg.length > 0) {
        noMatchInReg.slice(0, 5).forEach(r => console.log(`   - ${r.full_name || r.Name} (${r.phone || r['Mobile Number']})`));
    }

    console.log(`\n⚠️ CAPTURED Transactions in Razorpay but NO REGISTRATION found: ${missingRegForTx.length}`);
    if (missingRegForTx.length > 0) {
        missingRegForTx.slice(0, 5).forEach(t => console.log(`   - ${t.Email || t.email} (${t.Contact || t.contact}) - ${t['Payment ID'] || t.payment_id}`));
    }
}

compareFiles().catch(console.error);
