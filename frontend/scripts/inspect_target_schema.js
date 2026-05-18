
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
    // Try to get one record if any exist, or just check error message when selecting specific non-existent column
    const { data, error } = await supabase
        .from('trial_allocations')
        .select('*')
        .limit(1);

    if (error) console.log(error);
    else if (data.length > 0) console.log(Object.keys(data[0]));
    else console.log("Table exists but empty. Cannot infer columns from data.");

    // Attempt an insert with minimal data to see specific error
    const dummyId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
    const { error: insertError } = await supabase
        .from('trial_allocations')
        .insert({
            trial_id: dummyId, // This should look like a UUID
            workflow_id: dummyId,
            allocation_date: '2024-01-01'
        });

    if (insertError) console.log('Test Insert Error:', JSON.stringify(insertError, null, 2));
}

inspect();
