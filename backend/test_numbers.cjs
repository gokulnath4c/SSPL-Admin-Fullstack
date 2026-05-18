const axios = require('axios');

const EVOLUTION_API_URL = 'http://localhost:8080';
const EVOLUTION_API_KEY = 'sspl_secret_key_123';
const INSTANCE = 'sspl_admin';

const client = axios.create({
    baseURL: EVOLUTION_API_URL,
    headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
    }
});

const numbers = ["919790743413@s.whatsapp.net", "917871808328@s.whatsapp.net", "919444183183@s.whatsapp.net"];

async function test() {
    console.log('--- Phase 1: Checking WhatsApp Presence ---');
    try {
        const res = await client.post(`/chat/whatsappNumbers/${INSTANCE}`, {
            numbers: numbers
        });
        console.log('Check Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Check Failed:', e.response?.data || e.message);
    }

    console.log('\n--- Phase 3: Attempting to Add to Existing Group ---');
    try {
        const groupJid = '120363426598165831@g.us';
        const res = await client.post(`/group/updateParticipant/${INSTANCE}?groupJid=${groupJid}`, {
            action: 'add',
            participants: numbers
        });
        console.log('Update Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Update Failed:', e.response?.data || e.message);
    }
}

test();
