
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

const SAMPLE_EMAILS = [
    'nikitha.prasuja@gmail.com',
    'bharath16122003@gmail.com'
];

async function verify() {
    console.log("Verifying player status...");

    const { data: players, error } = await supabase
        .from('player_workflow')
        .select(`
            workflow_id,
            email,
            workflow_stage,
            trials_allocations (
                allocation_id,
                selection_status,
                allocation_venue
            )
        `)
        .in('email', SAMPLE_EMAILS);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(JSON.stringify(players, null, 2));
}

verify();
