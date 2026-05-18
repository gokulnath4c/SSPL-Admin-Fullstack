const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const id = '31153c98-0c11-431b-8efb-98c23ea8175d';
    
    // Update city/state to Bangalore
    const { data: updateCand, error: errCand } = await supabase
        .from('trial_candidates')
        .update({ state: 'BANGALORE' })
        .eq('id', id)
        .select();
        
    console.log("Update Candidate Error:", errCand);
    console.log("Updated Candidate:", updateCand);

    // Update progress to ensure L1 is Attended and Selected
    const { data: updateProg, error: errProg } = await supabase
        .from('trial_progress')
        .update({
            l1_attendance: 'ATTENDED',
            l1_result: 'SELECTED'
        })
        .eq('candidate_id', id)
        .select();

    console.log("Update Progress Error:", errProg);
    console.log("Updated Progress:", updateProg);
}

main().catch(console.error);
