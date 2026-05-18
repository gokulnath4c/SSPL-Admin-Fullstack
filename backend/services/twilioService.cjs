require('dotenv').config({ path: __dirname + '/../.env.production' });
const twilio = require('twilio');

class TwilioService {
    constructor() {
        this.client = new twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        this.from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    }

    async sendMessage(to, text) {
        try {
            const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:+${to.replace(/\D/g, '')}`;
            console.log(`[Twilio] Sending to ${formattedTo}...`);
            
            const message = await this.client.messages.create({
                body: text,
                from: this.from,
                to: formattedTo
            });
            
            return { success: true, sid: message.sid };
        } catch (error) {
            console.error(`[Twilio Error] ${error.message}`);
            throw error;
        }
    }
}

module.exports = new TwilioService();
