const axios = require('axios');

/**
 * CallMeBot Service
 * Sends WhatsApp messages via the CallMeBot shared gateway.
 * API: https://api.callmebot.com/whatsapp.php?phone=[phone]&text=[text]&apikey=[apikey]
 */
class CallMeBotService {
    async sendMessage(phoneNumber, text, apikey) {
        try {
            // Ensure phone starts with + or is just numbers
            const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
            const encodedText = encodeURIComponent(text);
            
            const url = `https://api.callmebot.com/whatsapp.php?phone=${formattedPhone}&text=${encodedText}&apikey=${apikey}`;
            
            const res = await axios.get(url);
            
            // CallMeBot usually returns a text response like "Message queued" or "Success"
            if (res.status === 200) {
                return { success: true, response: res.data };
            } else {
                throw new Error(`CallMeBot Error: ${res.data}`);
            }
        } catch (error) {
            console.error('CallMeBot Send Failed:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new CallMeBotService();
