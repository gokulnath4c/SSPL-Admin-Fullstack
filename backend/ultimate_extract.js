const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    const url = "https://fazpykekypcktcmniwbj.supabase.co";
    const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenB5a2VreXBja3RjbW5pd2JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgyNDIzNywiZXhwIjoyMDcxNDAwMjM3fQ.b9ydyxCtsJBV90DyMnHOcyVEsfJoUSIdqTGJak3ItZU";
    
    const supabase = createClient(url, key);
    const excelData = xlsx.readFile('C:/Users/ADMIN/Downloads/Call for Whatsapp.xlsx');
    const sheet = excelData.Sheets[excelData.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    
    // THE ULTIMATE TABLE LIST
    const tables = [
        'player_registrations', 
        'trial_view', 
        'players', 
        'trial_results', 
        'visitor_leads', 
        'whatsapp_campaigns', 
        'whatsapp_gateways',
        'rewards',
        'tournament_organizers',
        'selectors',
        'admin_invites'
    ];
    
    const playerMap = {};

    for (const table of tables) {
        console.log(`Deep scanning ${table}...`);
        let from = 0;
        const limit = 1000;
        let hasMore = true;
        
        while (hasMore) {
            try {
                const { data, error } = await supabase.from(table).select('*').range(from, from + limit - 1);
                if (error || !data) { hasMore = false; continue; }
                
                data.forEach(item => {
                    const name = item.full_name || item.player_name || item.name || item.first_name || item.contact_name || item.title;
                    if (!name || typeof name !== 'string') return;
                    
                    // Collect every possible field that could be a mobile or email
                    Object.entries(item).forEach(([key, val]) => {
                        if (!val || typeof val !== 'string') return;
                        
                        const lowerVal = val.toLowerCase().trim();
                        
                        // Check if it's an email
                        if (lowerVal.includes('@') && lowerVal.includes('.')) {
                            if (!playerMap[lowerVal]) playerMap[lowerVal] = name;
                        } 
                        // Check if it's a phone number
                        else {
                            const clean = lowerVal.replace(/\D/g, '');
                            if (clean.length >= 10) {
                                const last10 = clean.slice(-10);
                                if (!playerMap[last10]) playerMap[last10] = name;
                            }
                        }
                    });
                });

                if (data.length < limit) hasMore = false;
                else from += limit;
            } catch (e) {
                hasMore = false;
            }
        }
    }

    const output = rows.map(row => {
        const mobile = row['Mobile No.'] ? String(row['Mobile No.']).replace(/\D/g, '').slice(-10) : null;
        const email = row['Email ID'] ? String(row['Email ID']).toLowerCase().trim() : null;
        
        let fetchedName = 'NOT FOUND';
        if (mobile && playerMap[mobile]) fetchedName = playerMap[mobile];
        else if (email && playerMap[email]) fetchedName = playerMap[email];

        return {
            ...row,
            'Fetched Name': fetchedName
        };
    });

    const newSheet = xlsx.utils.json_to_sheet(output);
    const newCsv = xlsx.utils.sheet_to_csv(newSheet);
    fs.writeFileSync('C:/Users/ADMIN/Desktop/whatsapp_slots_with_names.csv', newCsv);
    console.log("Ultimate export completed.");
}
main();
