import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CAMPAIGN_ID = 'f18c6073-6650-4d1c-b2b1-9263e258625c';
const INSTANCE = 'sspl_admin';
const BRIDGE_URL = 'http://localhost:3003/api/whatsapp';

async function main() {
    try {
        console.log('--- Resuming Campaign: SSPLT10 Campaign ---');

        // 1. Update Settings to SAFE MODE
        console.log('Step 1: Updating settings to Safe Mode...');
        const { error: updErr } = await supabase
            .from('whatsapp_campaigns')
            .update({
                status: 'READY',
                daily_limit: 800,
                batch_size: 20,
                min_delay_seconds: 30,
                max_delay_seconds: 90
            })
            .eq('id', CAMPAIGN_ID);

        if (updErr) throw updErr;
        console.log('Settings updated: Daily Limit 800, Delay 30-90s, Batch 20.');

        // 2. Reset Failed Recipients
        console.log('Step 2: Resetting failed/stuck recipients...');
        const { error: resErr } = await supabase
            .from('whatsapp_campaign_recipients')
            .update({ status: 'PENDING', error_message: null })
            .eq('campaign_id', CAMPAIGN_ID)
            .in('status', ['FAILED', 'PAUSED']);

        if (resErr) throw resErr;
        console.log('Recipients reset to PENDING.');

        // 3. Trigger via Bridge
        console.log('Step 3: Triggering bridge server...');
        const res = await fetch(`${BRIDGE_URL}/send-bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                campaignId: CAMPAIGN_ID,
                instanceName: INSTANCE
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Bridge trigger failed');
        }

        const result = await res.json();
        console.log('Step 4: Verification Result:', result);
        console.log('\n--- Campaign is now RUNNING safely ---');

    } catch (err) {
        console.error('\n!!! ERROR:', err.message);
    }
}

main();
