const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { verifyWebhookSignature } = require('../services/razorpay-service');

/**
 * Helper to map webhook entity to schema
 */
function mapWebhookEntityToSchema(payload) {
    const payment = payload.payment ? payload.payment.entity : null;

    if (!payment) return null;

    return {
        payment_id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        fee: payment.fee ? payment.fee / 100 : null,
        tax: payment.tax ? payment.tax / 100 : null,
        created_at: new Date(payment.created_at * 1000).toISOString(),
        captured_at: payment.captured ? new Date(payment.created_at * 1000).toISOString() : null,
        raw_payload: payload,
        last_synced_at: new Date().toISOString()
    };
}

/**
 * POST /api/webhooks/razorpay
 * Handle Razorpay webhooks
 */
router.post('/webhooks/razorpay', async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.VITE_RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    if (!verifyWebhookSignature(body, signature, secret)) {
        console.error('Invalid Razorpay webhook signature');
        return res.status(400).json({ status: 'error', message: 'Invalid Signature' });
    }

    const { event, payload } = req.body;
    console.log(`Received Razorpay Webhook: ${event}`);

    // List of events we care about
    const handledEvents = [
        'payment.authorized',
        'payment.captured',
        'payment.failed',
        'order.paid',
        'refund.processed'
    ];

    if (!handledEvents.includes(event)) {
        console.log(`Ignoring unhandled event: ${event}`);
        return res.status(200).json({ status: 'ignored' });
    }

    try {
        const record = mapWebhookEntityToSchema(payload);

        if (record) {
            // Upsert into Supabase
            const { error } = await supabase
                .from('razorpay_ledger')
                .upsert(record, { onConflict: 'payment_id' });

            if (error) {
                console.error('Error updating ledger from webhook:', error);
                return res.status(500).json({ status: 'error', message: 'Database Error' });
            }

            console.log(`Successfully updated ledger for payment: ${record.payment_id} [${event}]`);
        }

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Admin API routes will be added here in Phase 4

module.exports = router;
