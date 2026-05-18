
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testColumn(colName, value) {
    const payload = {
        full_name: 'Test Col ' + colName,
        email: `test.${colName}.${Date.now()}@test.com`,
        phone: '0000000000',
        [colName]: value
    };

    const { error } = await supabase.from('player_registrations').insert(payload);

    // If error is PGRST204 (Cache), then THIS column is the problem.
    // If error is 23502 (Not Null), then we missed other required columns, but THIS column didn't crash the cache check (probably).
    // If success, this column is fine.

    if (error) {
        if (error.code === 'PGRST204') {
            fs.appendFileSync('scan_results.txt', `[FAIL] Column '${colName}' causes Schema Cache Error (PGRST204).\n`);
            return false;
        } else if (error.code === '23502') {
            fs.appendFileSync('scan_results.txt', `[PASS] Column '${colName}' accepted (but insert failed due to other Not Null constraints).Error: ${error.message}\n`);
            return true;
        } else {
            console.log(error);
            fs.appendFileSync('scan_results.txt', `[?] Column '${colName}' unknown error: ${error.code} - ${error.message}\n`);
            return true; // Assume column exists but other error
        }
    }
    fs.appendFileSync('scan_results.txt', `[SUCCESS] Column '${colName}' inserted successfully.\n`);
    return true;
}

async function run() {
    const columns = [
        { name: 'state', val: 'Tamil Nadu' },
        { name: 'city', val: 'Chennai' },
        { name: 'pincode', val: '600000' },
        { name: 'dob', val: '2000-01-01' },
        { name: 'gender', val: 'Male' },
        { name: 'role', val: 'Batsman' },
        { name: 'payment_status', val: 'captured' },
        { name: 'payment_amount', val: 0 },
        { name: 'verification_status', val: 'verified' }
    ];

    console.log("Testing columns...");
    for (const col of columns) {
        await testColumn(col.name, col.val);
    }
}

run();
