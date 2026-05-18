
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function debugJoins() {
    console.log("Debugging Joins...");

    // 1. Check Singular Table Count
    const { count: countTotal } = await supabase
        .from('trial_allocations')
        .select('*', { count: 'exact', head: true });
    console.log(`trial_allocations (Singular) Total: ${countTotal}`);

    // 2. Check Join with Workflow (Simulate Frontend)
    const { data: joinData, error: joinError, count: joinCount } = await supabase
        .from('trial_allocations')
        .select(`
            allocation_id,
            player_workflow!inner (
                workflow_id,
                full_name,
                workflow_stage
            )
        `, { count: 'exact' })
        .eq('player_workflow.workflow_stage', 'trials_allocated')
        .limit(5);

    if (joinError) console.error("Join Error:", joinError);
    else {
        console.log(`Allocation -> Workflow Inner Join Count: ${joinCount} (This matches frontend query logic)`);
        console.log("Sample Data:", JSON.stringify(joinData, null, 2));
    }

    // 3. Check Plural Table Count (Dashboard Source)
    const { count: countPlural } = await supabase
        .from('trials_allocations')
        .select('*', { count: 'exact', head: true });
    console.log(`trials_allocations (Plural - Dashboard Source) Total: ${countPlural}`);
}

debugJoins();
