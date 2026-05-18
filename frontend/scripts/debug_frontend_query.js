
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

async function simulateFrontendByChunks() {
    console.log("Simulating Frontend Query (getAllocatedTrials)...");

    // Mimic the exact query structure from trialsWorkflow.ts: getAllocatedTrials
    // It's a heavy query with !inner joins.

    // 1. First, check raw count in trials_allocations
    const { count: totalAlloc } = await supabase
        .from('trials_allocations')
        .select('*', { count: 'exact', head: true });
    console.log(`Total rows in 'trials_allocations': ${totalAlloc}`);

    // 2. Check how many of these have matching player_workflow with stage 'trials_allocated'
    // We can't do complex joins easily in one count if the frontend one is failing, so let's break it down.

    // Fetch a sample allocation
    const { data: sampleAlloc } = await supabase
        .from('trials_allocations')
        .select('workflow_id')
        .limit(5);

    if (sampleAlloc && sampleAlloc.length > 0) {
        const wfIds = sampleAlloc.map(a => a.workflow_id);
        console.log("Sample Workflow IDs from allocations:", wfIds);

        const { data: wfData } = await supabase
            .from('player_workflow')
            .select('workflow_id, workflow_stage, registration_id')
            .in('workflow_id', wfIds);

        console.log("Corresponding Workflow Data:", JSON.stringify(wfData, null, 2));
    }

    // 3. Try the actual Join Query
    const { data, error, count } = await supabase
        .from('trials_allocations')
        .select(`
            *,
            player_workflow!inner(
                workflow_id,
                registration_id,
                payment_status,
                workflow_stage,
                player_registrations!inner(
                    full_name
                )
            )
        `, { count: 'exact' })
        .eq('player_workflow.workflow_stage', 'trials_allocated');
    // .limit(10); 

    if (error) {
        console.error("Frontend Query Error:", error);
    } else {
        console.log(`Frontend Query Count: ${count}`);
        console.log(`Frontend Query Returned: ${data.length} rows`);
        if (data.length === 0) {
            console.log("Warning: Query returned 0 rows despite raw table having data.");
            console.log("Possible causes: ");
            console.log("1. 'player_workflow' stage is not 'trials_allocated'");
            console.log("2. 'player_registrations' link is missing (!inner join fails)");
        }
    }
}

simulateFrontendByChunks();
