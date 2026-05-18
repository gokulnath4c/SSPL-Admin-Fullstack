const XLSX = require('../../httpdocs/admin/react-app/node_modules/xlsx');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');
const fs = require('fs');
const path = require('path');

const inputFile = 'C:/Users/ADMIN/Downloads/Trials Not Attended.xlsx';

async function dryRunMatch() {
    try {
        console.log('--- Loading Data Sources ---');
        // 1. Load Excel
        const workbook = XLSX.readFile(inputFile);
        const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        console.log(`Excel Records: ${excelData.length}`);

        // 2. Load Level 1 Data (JSON)
        const l1Data = JSON.parse(fs.readFileSync('../httpdocs/public/Players_Data.json', 'utf8'));
        console.log(`L1 Records: ${l1Data.length}`);

        // 3. Load Level 2 Data (TS - extract from export const)
        const l2Raw = fs.readFileSync('../httpdocs/src/data/level2Data.ts', 'utf8');
        const eqIndex = l2Raw.indexOf('=');
        const l2Start = l2Raw.indexOf('[', eqIndex);
        const l2End = l2Raw.lastIndexOf(']');
        const l2JsonStr = l2Raw.substring(l2Start, l2End + 1);
        const l2Data = JSON.parse(l2JsonStr);
        console.log(`L2 Records: ${l2Data.length}`);

        console.log('\n--- Searching for Matches (Dry Run) ---');
        let matchedInDB = 0;
        let matchedResults = 0;
        const samples = [];

        // Helper to normalize phone
        const norm = (p) => String(p || '').replace(/\D/g, '').slice(-10);

        // Process first 20 for preview
        for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i];
            const email = String(row.EMAIL || '').toLowerCase().trim();
            const phone = norm(row.CONTACTV1);

            if (!email && !phone) continue;

            // Search Supabase
            let dbMatch = null;
            if (email) {
                const { data } = await supabase.from('player_registrations').select('full_name, phone, email').eq('email', email).limit(1);
                if (data && data.length > 0) dbMatch = data[0];
            }
            if (!dbMatch && phone) {
                const { data } = await supabase.from('player_registrations').select('full_name, phone, email').ilike('phone', `%${phone}%`).limit(1);
                if (data && data.length > 0) dbMatch = data[0];
            }

            if (dbMatch) {
                matchedInDB++;
                const correctPhone = norm(dbMatch.phone);
                
                // Search Results
                const l1Match = l1Data.find(p => norm(p.mobile) === correctPhone);
                const l2Match = l2Data.find(p => norm(p.mobile) === correctPhone);

                let resultStr = 'No Result Found';
                if (l1Match || l2Match) {
                    matchedResults++;
                    const l1Status = l1Match ? l1Match.status : 'None';
                    const l2Status = l2Match ? (l2Match.remarks.includes('GOOD') ? 'SELECTED' : 'AVERAGE') : 'None';
                    resultStr = `L1: ${l1Status}, L2: ${l2Status}`;
                }

                if (samples.length < 5) {
                    samples.push({
                        excel: { email, phone },
                        db: { name: dbMatch.full_name, phone: dbMatch.phone },
                        result: resultStr
                    });
                }
            }

            if (i % 50 === 0 && i > 0) console.log(`Processed ${i} / ${excelData.length}...`);
        }

        console.log('\n--- Dry Run Summary ---');
        console.log(`Total Records: ${excelData.length}`);
        console.log(`Matched in Database: ${matchedInDB}`);
        console.log(`Matched with Results: ${matchedResults}`);
        console.log(`Match Rate: ${((matchedInDB / excelData.length) * 100).toFixed(2)}%`);

        console.log('\n--- Sample Matches ---');
        console.log(JSON.stringify(samples, null, 2));

    } catch (error) {
        console.error('Dry run failed:', error);
    }
}

dryRunMatch();
