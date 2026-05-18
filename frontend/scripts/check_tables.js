
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTables() {
    // Check Plural (where I likely put data)
    const { count: countPlural, error: errorPlural } = await supabase
        .from('trials_allocations')
        .select('*', { count: 'exact', head: true });

    if (errorPlural) console.error('Error Plural:', errorPlural.message);
    else console.log(`trials_allocations count: ${countPlural}`);

    // Check Singular (where frontend reads)
    const { count: countSingular, error: errorSingular } = await supabase
        .from('trial_allocations')
        .select('*', { count: 'exact', head: true });

    if (errorSingular) console.error('Error Singular:', errorSingular.message);
    else console.log(`trial_allocations count: ${countSingular}`);
}

checkTables();
