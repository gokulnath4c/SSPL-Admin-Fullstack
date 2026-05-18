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
    
    const tables = ['player_registrations', 'trial_view', 'players', 'trial_results'];
    const playerMap = {};

    for (const table of tables) {
        console.log(`Fetching from ${table}...`);
        let from = 0;
        const limit = 1000;
        let hasMore = true;
        
        while (hasMore) {
            const { data, error } = await supabase.from(table).select('*').range(from, from + limit - 1);
            if (error) {
                console.log(`Error ${table}: ${error.message}`);
                hasMore = false;
                continue;
            }
            
            data.forEach(item => {
                const name = item.full_name || item.player_name || item.name || item.first_name;
                if (!name) return;
                
                const identifiers = [item.mobile, item.phone, item.whatsapp, item.whatsapp_number, item.email];
                identifiers.forEach(id => {
                    if (!id) return;
                    const key = String(id).toLowerCase().trim();
                    const cleanKey = key.replace(/\D/g, '').slice(-10);
                    
                    // Map both clean mobile and original email
                    if (key.includes('@')) {
                        if (!playerMap[key]) playerMap[key] = name;
                    } else if (cleanKey.length === 10) {
                        if (!playerMap[cleanKey]) playerMap[cleanKey] = name;
                    }
                });
            });

            if (data.length < limit) hasMore = false;
            else from += limit;
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
    console.log("Exported successfully.");
}
main();
