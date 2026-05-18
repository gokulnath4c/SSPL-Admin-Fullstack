
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function debugCompletedQuery() {
    console.log("Debugging getCompletedRegistrations query...");

    // Simulate the API call
    const { data: completedPlayers, error } = await supabase
        .from('player_workflow')
        .select('workflow_id, full_name, workflow_stage')
        .eq('workflow_stage', 'registration_completed');

    if (error) { console.error(error); return; }

    console.log(`Query returned ${completedPlayers.length} records with stage='registration_completed'.`);

    // Check if any of these are ALSO in trial_allocations
    // (Ideally, if they are in trial_allocations, their stage SHOULD be 'trials_allocated')
    // If we find a player here who IS in trial_allocations, it means their stage wasn't updated!

    const { data: allocations } = await supabase
        .from('trial_allocations')
        .select('workflow_id');

    const allocatedWorkflowIds = new Set(allocations.map(a => a.workflow_id));

    const badRecords = completedPlayers.filter(p => allocatedWorkflowIds.has(p.workflow_id));

    console.log(`Overlap Check: Found ${badRecords.length} records that are in 'Completed List' BUT also have an Allocation.`);

    if (badRecords.length > 0) {
        console.log("Example Bad Records (Have Allocation but Stage is 'registration_completed'):");
        badRecords.slice(0, 5).forEach(p => console.log(` - ${p.full_name} (${p.workflow_id})`));
        console.log("These need to have their stage updated to 'trials_allocated'.");
    }
}

debugCompletedQuery();
