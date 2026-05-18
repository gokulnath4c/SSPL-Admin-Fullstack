const aiService = require('../services/aiService.cjs');
const whatsappService = require('../services/whatsappService.cjs');
const supabase = require('../config/supabase.cjs');

/**
 * Log chat message to database
 */
const logToDb = async (role, message, platform, mobile_number, metadata = {}) => {
    try {
        await supabase.from('chat_logs').insert({
            role,
            message,
            platform,
            mobile_number,
            metadata
        });
    } catch (err) {
        console.error('Failed to log chat:', err);
    }
};

exports.handleWebChat = async (req, res) => {
    try {
        const { message, history, sessionId, mobile } = req.body; // mobile added

        if (!message) {
            return res.status(400).json({ success: false, error: 'Message is required' });
        }

        // Log User Message
        logToDb('user', message, 'web', mobile, { sessionId });

        const response = await aiService.generateResponse(message, history || []);

        // Log AI Response
        logToDb('assistant', response, 'web', mobile, { sessionId });

        res.json({
            success: true,
            response: response
        });
    } catch (error) {
        console.error('Web Chat Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

exports.handleWhatsAppWebhook = async (req, res) => {
    // Verification Request
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                res.status(200).send(challenge);
            } else {
                res.sendStatus(403);
            }
        }
    } else if (req.method === 'POST') {
        try {
            const body = req.body;

            // Check if this is an event from a WhatsApp subscription
            if (body.object === 'whatsapp_business_account') {
                for (const entry of body.entry) {
                    for (const change of entry.changes) {
                        if (change.value && change.value.messages) {
                            for (const message of change.value.messages) {
                                // Only handle text messages for now
                                if (message.type === 'text') {
                                    const from = message.from; // Phone number
                                    const text = message.text.body;
                                    const messageId = message.id;

                                    console.log(`Received WhatsApp message from ${from}: ${text}`);

                                    // Log User Message
                                    logToDb('user', text, 'whatsapp', from, { messageId });

                                    // 1. Mark as read
                                    await whatsappService.markAsRead(messageId);

                                    // 2. Generate AI Response
                                    const conversationHistory = [];
                                    const aiResponse = await aiService.generateResponse(text, conversationHistory);

                                    // Log AI Response
                                    logToDb('assistant', aiResponse, 'whatsapp', from, { to: from });

                                    // 3. Send Response
                                    await whatsappService.sendMessage(from, aiResponse);
                                }
                            }
                        }
                    }
                }
                res.sendStatus(200);
            } else {
                res.sendStatus(404);
            }
        } catch (error) {
            console.error('Error processing WhatsApp webhook:', error);
            res.sendStatus(500);
        }
    }
};
