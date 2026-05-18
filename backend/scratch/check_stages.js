const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    // We can't query information_schema directly via RPC usually, 
    // but we can try to fetch a record and see the keys.
    const { data, error } = await supabase
        .from('player_workflow')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    console.log('Sample Record Keys:', Object.keys(data[0] || {}));
    
    // Check if we can find other records with different stages
    const { data: stages, error: stageError } = await supabase
        .from('player_workflow')
        .select('workflow_stage')
        .limit(100);
    
    if (stageError) {
        console.error('Stage Error:', stageError);
    } else {
        const uniqueStages = [...new Set(stages.map(s => s.workflow_stage))];
        console.log('Unique Stages in DB:', uniqueStages);
    }
}

checkSchema();
