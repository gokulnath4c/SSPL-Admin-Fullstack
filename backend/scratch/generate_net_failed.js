const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function generateNetFailedReport() {
    console.log('Generating Net Failed Report...');
    const workbook = XLSX.readFile('C:/Users/ADMIN/Downloads/Master Data_SSPL as on 13-04-2026.xlsx');
    const masterData = XLSX.utils.sheet_to_json(workbook.Sheets['MASTER RAZORPAY TILL 13-04-2026']);
    
    const normalize = (num) => {
        if (!num) return null;
        let s = String(num).replace(/\D/g, '');
        if (s.startsWith('91') && s.length > 10) s = s.substring(2);
        return s;
    };

    const capturedMobiles = new Set();
    masterData.forEach(d => {
        if (d.status === 'captured') {
            const m = normalize(d.contact);
            if (m) capturedMobiles.add(m);
        }
    });

    const netFailedRows = [];
    masterData.forEach(d => {
        if (d.status === 'failed') {
            const m = normalize(d.contact);
            if (m && !capturedMobiles.has(m)) {
                netFailedRows.push(d);
            }
        }
    });

    console.log(`Found ${netFailedRows.length} Net Failed transaction records.`);

    // Convert to CSV
    const headers = Object.keys(netFailedRows[0] || {});
    let csv = headers.join(',') + '\n';
    netFailedRows.forEach(row => {
        csv += headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const outputPath = path.join(__dirname, 'net_failed_transactions.csv');
    fs.writeFileSync(outputPath, csv);
    console.log(`Report saved to ${outputPath}`);
    
    // Summary by mobile
    const uniqueNetMobiles = new Set(netFailedRows.map(r => normalize(r.contact)));
    console.log(`Total Unique Mobiles with ONLY failed attempts: ${uniqueNetMobiles.size}`);
}

generateNetFailedReport();
