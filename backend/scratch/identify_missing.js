const excelData = require('./razorpay_data_full.json');
require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');
const fs = require('fs');
const path = require('path');

async function identifyMissing() {
    const excelIds = excelData.map(d => d.id);
    console.log(`Analyzing ${excelIds.length} IDs from Excel...`);

    const dbIds = new Set();
    const CHUNK_SIZE = 100;
    
    for (let i = 0; i < excelIds.length; i += CHUNK_SIZE) {
        const chunk = excelIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('payment_id')
            .in('payment_id', chunk);

        if (error) {
            console.error('Error fetching from DB:', error);
            continue;
        }

        data.forEach(r => dbIds.add(r.payment_id));
    }

    const missing = excelIds.filter(id => !dbIds.has(id));
    console.log(`Found ${missing.length} missing IDs.`);
    
    // Save missing IDs for sync script
    const outputPath = path.join(__dirname, 'missing_payment_ids.json');
    fs.writeFileSync(outputPath, JSON.stringify(missing, null, 2));
    console.log(`Saved missing IDs to ${outputPath}`);

    // Break down by status in excel
    const missingDetails = excelData.filter(d => missing.includes(d.id));
    const statusCounts = missingDetails.reduce((acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
    }, {});
    console.log('Missing transaction status counts:', statusCounts);
}

identifyMissing();
