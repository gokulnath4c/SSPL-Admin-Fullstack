const axios = require('axios');
require('dotenv').config();

const WHATSAPP_API_URL = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Send a text message via WhatsApp Cloud API
 * @param {string} to - The recipient's phone number (with country code, no +)
 * @param {string} text - The message text
 */
const sendMessage = async (to, text) => {
    try {
        const response = await axios.post(
            WHATSAPP_API_URL,
            {
                messaging_product: 'whatsapp',
                to: to,
                text: { body: text },
            },
            {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('WhatsApp message sent:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.response ? error.response.data : error.message);
        throw error;
    }
};

/**
 * Mark a message as read
 * @param {string} messageId - The ID of the message to mark as read
 */
const markAsRead = async (messageId) => {
    try {
        await axios.post(
            WHATSAPP_API_URL,
            {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            },
            {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );
    } catch (error) {
        console.error('Error marking message as read:', error.message);
    }
};

module.exports = { sendMessage, markAsRead };
