const XLSX = require('../../httpdocs/admin/react-app/node_modules/xlsx');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

const filePath = 'C:/Users/ADMIN/Downloads/State NA.xlsx';

async function dryRunCount() {
    try {
        console.log('Reading Excel file...');
        const workbook = XLSX.readFile(filePath);
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const totalRows = data.length;
        console.log(`Total rows in Excel: ${totalRows}`);

        const phones = [...new Set(data.map(r => String(r.CONTACTV1 || '').replace(/\D/g, '').slice(-10)).filter(Boolean))];
        const emails = [...new Set(data.map(r => String(r.EMAIL || '').toLowerCase().trim()).filter(Boolean))];

        console.log(`Extracted ${phones.length} unique phones and ${emails.length} unique emails.`);

        // Due to Supabase query limits, we'll check in chunks of 500
        let foundCount = 0;
        const matchingIds = new Set();
        
        const CHUNK_SIZE = 100; // Small chunks for safe 'in' queries
        
        console.log('Checking database for matches...');
        
        // Match by phone
        for (let i = 0; i < phones.length; i += CHUNK_SIZE) {
            const chunk = phones.slice(i, i + CHUNK_SIZE);
            const { data: matches } = await supabase
                .from('player_registrations')
                .select('phone, email, state')
                .or(chunk.map(p => `phone.ilike.%${p}%`).join(','))
                .not('state', 'is', null);
            
            if (matches) {
                matches.forEach(m => {
                    matchingIds.add(m.phone.replace(/\D/g, '').slice(-10));
                    matchingIds.add(m.email.toLowerCase());
                });
            }
        }

        // Match by email
        for (let i = 0; i < emails.length; i += CHUNK_SIZE) {
            const chunk = emails.slice(i, i + CHUNK_SIZE);
            const { data: matches } = await supabase
                .from('player_registrations')
                .select('phone, email, state')
                .in('email', chunk)
                .not('state', 'is', null);

            if (matches) {
                matches.forEach(m => {
                    matchingIds.add(m.phone.replace(/\D/g, '').slice(-10));
                    matchingIds.add(m.email.toLowerCase());
                });
            }
        }

        // Final count: check how many rows from the original data match at least one ID in our found set
        let count = 0;
        data.forEach(row => {
            const rowPhone = String(row.CONTACTV1 || '').replace(/\D/g, '').slice(-10);
            const rowEmail = String(row.EMAIL || '').toLowerCase().trim();
            if (matchingIds.has(rowPhone) || matchingIds.has(rowEmail)) {
                count++;
            }
        });

        console.log(`\n--- Summary ---`);
        console.log(`Total Records: ${totalRows}`);
        console.log(`Found Matches: ${count}`);
        console.log(`Percentage: ${((count / totalRows) * 100).toFixed(2)}%`);

    } catch (error) {
        console.error('Error during dry run:', error);
    }
}

dryRunCount();
