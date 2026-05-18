// ✅ BACKEND ENDPOINT - Check Razorpay Payment Status
// Deploy this as a Supabase Edge Function or your backend API

// For Node.js/Express backend:
/*
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post('/api/razorpay/check-payment', async (req, res) => {
  try {
    const { orderId, paymentId } = req.body;

    let paymentStatus = null;

    if (paymentId) {
      // Check payment directly
      const payment = await razorpay.payments.fetch(paymentId);
      paymentStatus = payment.status; // 'created', 'authorized', 'captured', 'refunded', 'failed'
    } else if (orderId) {
      // Check order and get payments
      const order = await razorpay.orders.fetch(orderId);
      paymentStatus = order.status; // 'created', 'attempted', 'paid'
    }

    res.json({
      status: paymentStatus,
      completed: paymentStatus === 'captured' || paymentStatus === 'paid' || paymentStatus === 'authorized',
    });
  } catch (error) {
    console.error('Razorpay API error:', error);
    res.status(500).json({ error: error.message });
  }
});
*/

// For Supabase Edge Functions (TypeScript):
/*
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { orderId, paymentId } = await req.json()

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)

    let response

    if (paymentId) {
      response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: { Authorization: `Basic ${auth}` },
      })
    } else if (orderId) {
      response = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        method: 'GET',
        headers: { Authorization: `Basic ${auth}` },
      })
    }

    const data = await response.json()

    return new Response(
      JSON.stringify({
        status: data.status,
        completed: data.status === 'captured' || data.status === 'paid' || data.status === 'authorized',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
*/

export default {}
