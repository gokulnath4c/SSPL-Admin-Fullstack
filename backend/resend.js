const ev = require('./services/evolutionService.cjs');
const fs = require('fs');

async function resend() {
    const code = fs.readFileSync('./scripts/send_whatsapp_slots.js', 'utf8');
    const match = code.match(/const MESSAGE_TEMPLATE = `([\s\S]*?)`;/);
    if (!match) return;
    const template = match[1].replace('{SLOT_TIMING}', '9 AM - 10 AM');
    
    try {
        await ev.sendMessage('sspl_admin', '918682884766', template);
        console.log('Successfully re-sent to 918682884766');
    } catch(e) {
        console.error('Failed:', e.message);
    }
}
resend();
