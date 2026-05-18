
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

async function checkCounts() {
    console.log("Checking counts...");

    // Check trials_allocations
    const { count: allocCount, error: allocError } = await supabase
        .from('trials_allocations')
        .select('*', { count: 'exact', head: true });

    console.log(`Trials Allocations: ${allocCount} (Error: ${allocError?.message})`);

    // Check player_workflow in trials_allocated stage
    const { count: wfCount, error: wfError } = await supabase
        .from('player_workflow')
        .select('*', { count: 'exact', head: true })
        .eq('workflow_stage', 'trials_allocated');

    console.log(`Workflow 'trials_allocated': ${wfCount} (Error: ${wfError?.message})`);
}

checkCounts();
