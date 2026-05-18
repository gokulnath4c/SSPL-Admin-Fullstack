const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('player_workflow')
        .select('*')
        .eq('registration_id', 'reg_8786047395646197');
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log('Workflow Data:', data);
}

check();
