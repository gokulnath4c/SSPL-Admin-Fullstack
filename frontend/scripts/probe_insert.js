
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function probe() {
    console.log("Probing Registration Insert...");

    const payload = {
        full_name: 'Probe User',
        email: 'probe.user.unique.123@test.com',
        phone: '9999999999',
        payment_status: 'captured',
        payment_amount: 0,
        verification_status: 'verified',
        state: 'Tamil Nadu',
        city: 'Chennai',
        pincode: '600000',
        dob: '2000-01-01',
        gender: 'Male',
        role: 'Batsman',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('player_registrations')
        .insert(payload)
        .select();

    if (error) {
        console.error('Probe Failed:', JSON.stringify(error, null, 2));
    } else {
        console.log('Probe Success:', data);
        // Clean up
        await supabase.from('player_registrations').delete().eq('id', data[0].id);
    }
}

probe();
