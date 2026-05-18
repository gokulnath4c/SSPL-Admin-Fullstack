const XLSX = require('../../httpdocs/admin/react-app/node_modules/xlsx');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');
const fs = require('fs');

const inputFile = 'C:/Users/ADMIN/Downloads/Trials Not Attended.xlsx';
const outputFile = 'C:/Users/ADMIN/Downloads/Trials_Not_Attended_Updated.xlsx';

async function generateUpdatedExcel() {
    try {
        console.log('--- Loading Data Sources ---');
        // 1. Load Excel
        const workbook = XLSX.readFile(inputFile);
        const excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        // 2. Load Level 1 Data (JSON)
        const l1Data = JSON.parse(fs.readFileSync('../httpdocs/public/Players_Data.json', 'utf8'));

        // 3. Load Level 2 Data (TS)
        const l2Raw = fs.readFileSync('../httpdocs/src/data/level2Data.ts', 'utf8');
        const eqIndex = l2Raw.indexOf('=');
        const l2Start = l2Raw.indexOf('[', eqIndex);
        const l2End = l2Raw.lastIndexOf(']');
        const l2JsonStr = l2Raw.substring(l2Start, l2End + 1);
        const l2Data = JSON.parse(l2JsonStr);

        console.log('\n--- Reconciling Data ---');
        const norm = (p) => String(p || '').replace(/\D/g, '').slice(-10);
        const updatedData = [];

        for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i];
            const email = String(row.EMAIL || '').toLowerCase().trim();
            const phone = norm(row.CONTACTV1);

            let newRow = { ...row, 
                "CORRECTED NAME": "Not Found in DB", 
                "CORRECTED PHONE": "Not Found in DB", 
                "CORRECTED EMAIL": "Not Found in DB", 
                "TRIAL RESULT": "Not Found" 
            };

            if (!email && !phone) {
                updatedData.push(newRow);
                continue;
            }

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
                const correctPhone = norm(dbMatch.phone);
                newRow["CORRECTED NAME"] = dbMatch.full_name;
                newRow["CORRECTED PHONE"] = dbMatch.phone;
                newRow["CORRECTED EMAIL"] = dbMatch.email;
                
                // Search Results
                const l1Match = l1Data.find(p => norm(p.mobile) === correctPhone);
                const l2Match = l2Data.find(p => norm(p.mobile) === correctPhone);

                let resultStr = 'No Result Found';
                if (l1Match || l2Match) {
                    const l1Status = l1Match ? l1Match.status : 'None';
                    const l2Status = l2Match ? (l2Match.remarks.includes('GOOD') ? 'SELECTED' : 'AVERAGE') : 'None';
                    resultStr = `L1: ${l1Status}, L2: ${l2Status}`;
                }
                newRow["TRIAL RESULT"] = resultStr;
            }
            updatedData.push(newRow);
        }

        console.log('\n--- Generating Export ---');
        const newSheet = XLSX.utils.json_to_sheet(updatedData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Reconciled');
        XLSX.writeFile(newWorkbook, outputFile);
        
        console.log(`Execution complete. Saved to: ${outputFile}`);

    } catch (error) {
        console.error('Failed to generate export:', error);
    }
}

generateUpdatedExcel();
