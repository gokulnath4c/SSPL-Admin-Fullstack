const XLSX = require('xlsx');
require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

async function checkUserDataMismatches() {
    console.log('Deep-searching for 3 mismatches in User Data (Email/Contact)...');
    const workbook = XLSX.readFile('C:/Users/ADMIN/Downloads/Master Data_SSPL as on 13-04-2026.xlsx');
    const masterData = XLSX.utils.sheet_to_json(workbook.Sheets['MASTER RAZORPAY TILL 13-04-2026']);
    
    const captured = masterData.filter(d => d.status === 'captured');
    const CHUNK_SIZE = 100;
    const mismatches = [];

    for (let i = 0; i < captured.length; i += CHUNK_SIZE) {
        const chunk = captured.slice(i, i + CHUNK_SIZE);
        const { data } = await supabase
            .from('razorpay_ledger')
            .select('payment_id, email, contact')
            .in('payment_id', chunk.map(c => c.id));

        if (!data) continue;
        const dbMap = new Map(data.map(r => [r.payment_id, r]));

        chunk.forEach(c => {
            const db = dbMap.get(c.id);
            if (db) {
                const emailMatch = (String(c.email || '').toLowerCase() === String(db.email || '').toLowerCase());
                // For contact, compare normalized
                const normalize = (n) => String(n || '').replace(/\D/g, '').slice(-10);
                const contactMatch = (normalize(c.contact) === normalize(db.contact));

                if (!emailMatch || !contactMatch) {
                    mismatches.push({
                        id: c.id,
                        excelEmail: c.email,
                        dbEmail: db.email,
                        excelContact: c.contact,
                        dbContact: db.contact
                    });
                }
            }
        });
    }

    console.log(`Found ${mismatches.length} user data mismatches.`);
    if (mismatches.length > 0) {
        console.table(mismatches);
    }
    
    // Check if there are exactly 3 unique IDs in the Excel Captured that are MISSING in player_registrations 
    // but the user expects them to be there.
    // Wait, let's look for the 3 transactions the user is referring to by checking if any ID in the 
    // Master Razorpay sheet has a status 'captured' but it is not found in the 'CAPTURED - 2731' sheet?
}

checkUserDataMismatches();
