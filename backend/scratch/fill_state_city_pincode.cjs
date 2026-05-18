const XLSX = require('../../httpdocs/admin/react-app/node_modules/xlsx');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

const inputFile = 'C:/Users/ADMIN/Downloads/State NA.xlsx';
const outputFile = 'C:/Users/ADMIN/Downloads/State_Filled.xlsx';

async function fillData() {
    try {
        console.log('Reading input file...');
        const workbook = XLSX.readFile(inputFile);
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        console.log(`Processing ${data.length} rows...`);

        const updatedData = [];
        let filledCount = 0;

        for (const row of data) {
            const phone = String(row.CONTACTV1 || '').replace(/\D/g, '').slice(-10);
            const email = String(row.EMAIL || '').toLowerCase().trim();

            let matches = null;
            
            // Search by phone first
            if (phone) {
                const { data: phoneMatches } = await supabase
                    .from('player_registrations')
                    .select('state, city, pincode')
                    .ilike('phone', `%${phone}%`)
                    .not('state', 'is', null)
                    .limit(1);
                
                if (phoneMatches && phoneMatches.length > 0) {
                    matches = phoneMatches[0];
                }
            }

            // Fallback to email if phone didn't work
            if (!matches && email) {
                const { data: emailMatches } = await supabase
                    .from('player_registrations')
                    .select('state, city, pincode')
                    .eq('email', email)
                    .not('state', 'is', null)
                    .limit(1);
                
                if (emailMatches && emailMatches.length > 0) {
                    matches = emailMatches[0];
                }
            }

            // Update row with found data
            const newRow = { ...row };
            if (matches) {
                newRow.STATE = matches.state || '';
                newRow.CITY = matches.city || '';
                newRow.PINCODE = matches.pincode || '';
                filledCount++;
                console.log(`✅ Filled data for: ${row.EMAIL || row.CONTACTV1}`);
            } else {
                newRow.STATE = 'Not Found';
                newRow.CITY = 'Not Found';
                newRow.PINCODE = 'Not Found';
            }
            updatedData.push(newRow);
        }

        console.log('\nWriting updated file...');
        const newSheet = XLSX.utils.json_to_sheet(updatedData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Filled Data');
        XLSX.writeFile(newWorkbook, outputFile);

        console.log(`\n--- Execution Complete ---`);
        console.log(`Total Rows: ${data.length}`);
        console.log(`Rows Filled: ${filledCount}`);
        console.log(`File saved to: ${outputFile}`);

    } catch (error) {
        console.error('Execution failed:', error);
    }
}

fillData();
