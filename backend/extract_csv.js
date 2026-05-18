const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    const env = fs.readFileSync('.env.production', 'utf8');
    const urlMatch = env.match(/VITE_SUPABASE_URL="(.*?)"/);
    const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=([\w\-\.]+)/);
    
    if (!urlMatch || !keyMatch) {
        console.error("Missing supabase credentials");
        return;
    }
    
    const supabase = createClient(urlMatch[1], keyMatch[1]);
    
    const excelData = xlsx.readFile('C:/Users/ADMIN/Downloads/Call for Whatsapp.xlsx');
    const sheet = excelData.Sheets[excelData.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    
    let regs = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;
    
    while (hasMore) {
        const { data, error } = await supabase.from('player_registrations').select('*').range(from, from + limit - 1);
        if (error) {
            console.error("DB Error:", error);
            return;
        }
        regs = regs.concat(data);
        if (data.length < limit) {
            hasMore = false;
        } else {
            from += limit;
        }
    }
    
    console.log(`Fetched ${regs.length} registrations from DB.`);
    
    // Fetch trial_view
    const { data: trials } = await supabase.from('trial_view').select('*').limit(10000);
    console.log(`Fetched ${trials ? trials.length : 0} from trial_view.`);
    
    // Fetch players
    const { data: playersList } = await supabase.from('players').select('*').limit(10000);
    console.log(`Fetched ${playersList ? playersList.length : 0} from players.`);
    
    // Create a map of mobile number to player
    const playerMap = {};
    
    const addToMap = (item) => {
        if (!item) return;
        const name = item.full_name || item.player_name || item.name || item.first_name;
        if (!name) return;
        
        if (item.mobile) playerMap[item.mobile.replace(/\D/g, '').slice(-10)] = { ...item, _name: name };
        if (item.phone) playerMap[item.phone.replace(/\D/g, '').slice(-10)] = { ...item, _name: name };
        if (item.whatsapp) playerMap[item.whatsapp.replace(/\D/g, '').slice(-10)] = { ...item, _name: name };
        if (item.whatsapp_number) playerMap[item.whatsapp_number.replace(/\D/g, '').slice(-10)] = { ...item, _name: name };
        if (item.email) playerMap[item.email.toLowerCase().trim()] = { ...item, _name: name };
    };

    if (regs) regs.forEach(addToMap);
    if (trials) trials.forEach(addToMap);
    if (playersList) playersList.forEach(addToMap);
    
    const output = [];
    for (const row of rows) {
        const mobile = row['Mobile No.'] ? String(row['Mobile No.']).replace(/\D/g, '').slice(-10) : null;
        const email = row['Email ID'] ? String(row['Email ID']).toLowerCase().trim() : null;
        
        let player = null;
        if (mobile && playerMap[mobile]) {
            player = playerMap[mobile];
        } else if (email && playerMap[email]) {
            player = playerMap[email];
        }
        
        const fetchedName = player ? player._name : 'NOT FOUND';
        
        output.push({
            'S.NO': row['S.NO'],
            'Mobile No.': row['Mobile No.'],
            'Email ID': row['Email ID'],
            'SLOT TIMING': row['SLOT TIMING'],
            'Fetched Name': fetchedName,
            'Registration ID': player ? player.id : ''
        });
    }
    
    const newSheet = xlsx.utils.json_to_sheet(output);
    const newCsv = xlsx.utils.sheet_to_csv(newSheet);
    
    fs.writeFileSync('C:/Users/ADMIN/Desktop/whatsapp_slots_with_names.csv', newCsv);
    console.log("Exported successfully to C:/Users/ADMIN/Desktop/whatsapp_slots_with_names.csv");
}
main();
