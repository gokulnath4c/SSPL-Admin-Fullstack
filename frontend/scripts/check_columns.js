
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
    // We can't query information_schema easily via supabase-js without privileges, usually.
    // Try to infer from a valid record if one exists.
    const { data } = await supabase.from('player_registrations').select('*').limit(1);
    if (data && data.length > 0) {
        console.log("Existing columns:", Object.keys(data[0]).join(', '));
    } else {
        console.log("No data found to infer columns.");
    }
}

checkColumns();
