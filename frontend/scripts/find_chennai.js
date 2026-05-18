
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

async function findChennai() {
    // 1. Find Center
    const { data: centers } = await supabase
        .from('trials_centers')
        .select('*')
        .ilike('center_name', '%Chennai%');

    if (!centers || centers.length === 0) {
        console.log("No Chennai center found.");
        return;
    }

    console.log(`Found ${centers.length} center(s):`);
    centers.forEach(c => console.log(`CENTER: ${c.center_name} (${c.center_id})`));

    // 2. Find Trials for these centers
    const centerIds = centers.map(c => c.center_id);
    const { data: trials } = await supabase
        .from('trials')
        .select('*')
        .in('center_id', centerIds);

    if (!trials || trials.length === 0) {
        console.log("No trials found for these centers.");
    } else {
        console.log(`Found ${trials.length} trial(s):`);
        trials.forEach(t => console.log(`TRIAL: ${t.trial_name} (${t.trial_id}) - ${t.trial_date}`));
    }
}

findChennai();
