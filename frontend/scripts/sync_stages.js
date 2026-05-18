
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncStages() {
    console.log("Syncing stages...");

    // 1. Get all workflow IDs from trials_allocations
    const { data: allocations, error: allocError } = await supabase
        .from('trials_allocations')
        .select('workflow_id');

    if (allocError) {
        console.error("Fetch Error:", allocError);
        return;
    }

    const workflowIds = allocations.map(a => a.workflow_id);
    console.log(`Found ${workflowIds.length} allocated players.`);

    if (workflowIds.length === 0) return;

    // 2. Update player_workflow
    // We do it in chunks to avoid URL length limits if that's an issue (though 160 ids is fine)
    const { error: updateError } = await supabase
        .from('player_workflow')
        .update({ workflow_stage: 'trials_allocated' })
        .in('workflow_id', workflowIds);

    if (updateError) {
        console.error("Update Error:", updateError);
    } else {
        console.log("Successfully updated workflow stages.");
    }

    // Verify
    const { count } = await supabase
        .from('player_workflow')
        .select('*', { count: 'exact', head: true })
        .eq('workflow_stage', 'trials_allocated');

    console.log(`Workflow 'trials_allocated' count now: ${count}`);
}

syncStages();
