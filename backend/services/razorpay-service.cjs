require('dotenv').config({ path: __dirname + '/../.env.production' });
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET
});

/**
 * Fetch all payments with pagination
 * @param {Object} options - { from: timestamp, to: timestamp, count: number, skip: number }
 * @returns {Promise<Array>} List of payments
 */
async function fetchAllPayments(options = {}) {
    const { from, to, count = 100, skip = 0 } = options;
    try {
        const params = {
            count,
            skip,
            ...(from && { from }),
            ...(to && { to })
        };
        const response = await razorpay.payments.all(params);
        return response.items;
    } catch (error) {
        console.error('Error fetching payments from Razorpay:', error);
        // Don't throw, return empty array to avoid breaking loops if possible, or throw if critical
        // Keeping throw to match previous logic
        throw error;
    }
}

/**
 * Fetch a single payment by ID
 * @param {string} paymentId 
 * @returns {Promise<Object>} Payment details
 */
async function fetchPaymentById(paymentId) {
    try {
        return await razorpay.payments.fetch(paymentId);
    } catch (error) {
        console.error(`Error fetching payment ${paymentId}:`, error);
        throw error;
    }
}

/**
 * Verify webhook signature
 * @param {string} body 
 * @param {string} signature 
 * @param {string} secret 
 * @returns {boolean}
 */
function verifyWebhookSignature(body, signature, secret) {
    if (!secret) {
        console.warn('Webhook secret not provided for verification');
        return false;
    }
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    return expectedSignature === signature;
}

module.exports = {
    razorpay,
    fetchAllPayments,
    fetchPaymentById,
    verifyWebhookSignature
};
