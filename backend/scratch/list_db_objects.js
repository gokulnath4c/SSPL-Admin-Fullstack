const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTriggers() {
    const { data, error } = await supabase.rpc('get_database_triggers');
    
    if (error) {
        // If RPC doesn't exist, try querying pg_trigger directly if possible (not possible via RPC usually)
        console.error('Error fetching triggers via RPC:', error);
        
        // Try to fetch functions instead
        const { data: functions, error: funcError } = await supabase.rpc('get_database_functions');
        if (funcError) {
             console.error('Error fetching functions:', funcError);
        } else {
             console.log('Functions:', functions);
        }
        return;
    }
    
    console.log('Triggers:', data);
}

listTriggers();
