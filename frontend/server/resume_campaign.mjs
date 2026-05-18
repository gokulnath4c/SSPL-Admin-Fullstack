import fetch from 'node-fetch';

const API_URL = 'http://localhost:3003/api/whatsapp';
const CAMPAIGN_ID = 'f18c6073-6650-4d1c-b2b1-9263e258625c';
const INSTANCE = 'sspl_admin';

async function trigger() {
    try {
        console.log('Checking active workers...');
        const statusRes = await fetch(`${API_URL}/workers/status`);
        if (!statusRes.ok) throw new Error(`Status check failed: ${statusRes.statusText}`);
        
        const status = await statusRes.json();
        console.log('Current worker status:', status);

        // If instance is already busy, stop it first
        const isBusy = status.some(w => w.instance === INSTANCE);
        if (isBusy) {
            console.log(`Instance ${INSTANCE} is busy. Stopping campaign worker...`);
            // We use the campaign ID pause since we want all workers for this campaign to stop
            // Or just stop by instance if we want to clear the instance
            // Based on server.js: app.post('/api/whatsapp/campaign/:id/pause', ...)
            await fetch(`${API_URL}/campaign/${CAMPAIGN_ID}/pause`, { method: 'POST' });
            await new Promise(r => setTimeout(r, 2000));
        }

        console.log(`Triggering resumption for campaign ${CAMPAIGN_ID} on instance ${INSTANCE}...`);
        const res = await fetch(`${API_URL}/send-bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                campaignId: CAMPAIGN_ID, 
                instanceName: INSTANCE 
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to trigger resumption');
        }

        const result = await res.json();
        console.log('Trigger Result:', result);
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}

trigger();
