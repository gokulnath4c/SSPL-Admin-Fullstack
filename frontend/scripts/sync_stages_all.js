
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

async function syncAll() {
    console.log("Syncing ALL allocated players...");

    // 1. Get all workflow IDs from trials_allocations
    // Using simple select, no count needed now
    const { data: allocations, error: allocError } = await supabase
        .from('trials_allocations')
        .select('workflow_id');

    if (allocError) {
        console.error("Fetch Error:", allocError);
        return;
    }

    const workflowIds = allocations.map(a => a.workflow_id);
    console.log(`Found ${workflowIds.length} allocated players in table.`);

    if (workflowIds.length === 0) return;

    // 2. Update player_workflow
    // We'll interpret success by checking how many rows modified if possible, or just trusting it.
    // Supabase JS update returns data on matched rows.

    const { data: updated, error: updateError } = await supabase
        .from('player_workflow')
        .update({ workflow_stage: 'trials_allocated' })
        .in('workflow_id', workflowIds)
        .select('workflow_id');

    if (updateError) {
        console.error("Update Error:", updateError);
    } else {
        console.log(`Successfully updated ${updated.length} workflow stages.`);
    }
}

syncAll();
