const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController.cjs');

// Web Chat Endpoint
router.post('/chat/web', chatController.handleWebChat);

// WhatsApp Webhook Endpoint
router.all('/chat/whatsapp/webhook', chatController.handleWhatsAppWebhook);

module.exports = router;
