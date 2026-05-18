require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

async function search() {
    const p = '9087997975';
    console.log('Searching everywhere for:', p);
    const tables = ['player_registrations', 'trial_candidates', 'player_workflow', 'leads', 'results', 'assessments', 'level_1', 'level_2', 'trial_results'];

    for (const t of tables) {
        try {
            // First check if table exists by trying a select limit 1
            const { data: cols, error: colError } = await supabase.from(t).select('*').limit(1);
            if (colError) continue;

            const { data } = await supabase
                .from(t)
                .select('*')
                .or(`phone.ilike.%${p}%,mobile.ilike.%${p}%,contact.ilike.%${p}%`);

            if (data && data.length > 0) {
                console.log(`\n!!! Found in [${t}] !!!`);
                console.log(JSON.stringify(data, null, 2));
            }
        } catch (e) {
            // console.log(`Table ${t} search failed:`, e.message);
        }
    }
}

search();
