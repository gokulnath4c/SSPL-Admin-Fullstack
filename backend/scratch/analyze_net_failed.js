const XLSX = require('xlsx');
const fs = require('fs');

async function analyzeNetFailed() {
    console.log('Reading Master Excel...');
    const workbook = XLSX.readFile('C:/Users/ADMIN/Downloads/Master Data_SSPL as on 13-04-2026.xlsx');
    const masterData = XLSX.utils.sheet_to_json(workbook.Sheets['MASTER RAZORPAY TILL 13-04-2026']);
    
    // Normalize mobile numbers (remove +91, handle numbers)
    const normalize = (num) => {
        if (!num) return null;
        let s = String(num).replace(/\D/g, '');
        if (s.startsWith('91') && s.length > 10) s = s.substring(2);
        return s;
    };

    const capturedMobiles = new Set();
    const failedMobiles = new Set();
    const mapMobileToFailedRecords = new Map();

    masterData.forEach(d => {
        const mobile = normalize(d.contact);
        if (!mobile) return;

        if (d.status === 'captured') {
            capturedMobiles.add(mobile);
        } else if (d.status === 'failed') {
            failedMobiles.add(mobile);
            if (!mapMobileToFailedRecords.has(mobile)) {
                mapMobileToFailedRecords.set(mobile, []);
            }
            mapMobileToFailedRecords.get(mobile).push(d);
        }
    });

    console.log(`Unique mobiles with Captured: ${capturedMobiles.size}`);
    console.log(`Unique mobiles with Failed: ${failedMobiles.size}`);

    // Net Failed = Mobiles that have Failed but NO Captured
    const netFailedMobiles = [...failedMobiles].filter(m => !capturedMobiles.add(m) && false); // Wait, logic error.
    // Correct logic:
    const netFailedList = [];
    failedMobiles.forEach(m => {
        if (!capturedMobiles.has(m)) {
            netFailedList.push(m);
        }
    });

    console.log(`Net Failed mobile count: ${netFailedList.length}`);
    
    // Compare with the sheet 'NET FAILED - 1166'
    const netFailedSheet = workbook.Sheets['NET FAILED - 1166'];
    if (netFailedSheet) {
        const sheetData = XLSX.utils.sheet_to_json(netFailedSheet);
        console.log(`Records in 'NET FAILED - 1166' sheet: ${sheetData.length}`);
    }

    // Now let's try to find the "3 mismatching captured transactions"
    // Maybe they are transactions that are 'captured' in the Excel but are effectively 'failed' or 'not required' in our DB?
    // Or maybe the 3 mismatches are in a specific list.
    
}

analyzeNetFailed();
