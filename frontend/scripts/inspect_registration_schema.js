
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectReg() {
    // Attempt minimal insert to probe schema
    const { error } = await supabase
        .from('player_registrations')
        .insert({
            full_name: 'Test Schema',
            email: 'test_schema_probe@test.com',
            phone: '0000000000'
        });

    if (error) console.log('Probe Error:', JSON.stringify(error, null, 2));
    else console.log('Probe Success (Test record created, please delete)');
}

inspectReg();
