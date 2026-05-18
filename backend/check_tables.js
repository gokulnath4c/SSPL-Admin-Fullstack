const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    const env = fs.readFileSync('.env.production', 'utf8');
    const urlMatch = env.match(/VITE_SUPABASE_URL="(.*?)"/);
    const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=([\w\-\.]+)/);
    
    const supabase = createClient(urlMatch[1], keyMatch[1]);
    
    const tables = ['trial_view', 'trial_results', 'player_data', 'players', 'unified_tracking_report', 'visitor_leads'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table ${table} error:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Table ${table} columns:`, Object.keys(data[0]));
        } else {
            console.log(`Table ${table} is empty.`);
        }
    }
}
main();
