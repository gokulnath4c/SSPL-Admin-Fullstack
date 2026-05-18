
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function analyzeInvalid() {
    console.log("Fetching allocations...");
    const { data: allocations } = await supabase.from('trials_allocations').select('workflow_id');
    const allocIds = allocations.map(a => a.workflow_id);
    console.log(`Total Allocations: ${allocIds.length}`);

    console.log("Fetching workflows...");
    const { data: workflows } = await supabase.from('player_workflow').select('workflow_id, workflow_stage').in('workflow_id', allocIds);

    const foundIds = new Set(workflows.map(w => w.workflow_id));
    const missing = allocIds.filter(id => !foundIds.has(id));

    console.log(`Missing from Workflow Table: ${missing.length}`);
    if (missing.length > 0) console.log(`Sample Missing ID: ${missing[0]}`);

    const wrongStage = workflows.filter(w => w.workflow_stage !== 'trials_allocated');
    console.log(`Wrong Stage: ${wrongStage.length}`);
    if (wrongStage.length > 0) {
        console.log("Sample Wrong Stage:", JSON.stringify(wrongStage[0]));
    }
}

analyzeInvalid();
