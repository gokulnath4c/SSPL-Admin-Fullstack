
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

async function listAllTrials() {
    console.log("Fetching...");
    const { data: trials, error } = await supabase
        .from('trials')
        .select('*');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("COUNT:", trials.length);
    console.log(JSON.stringify(trials, null, 2));
}

listAllTrials();
