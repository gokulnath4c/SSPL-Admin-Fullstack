import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function backfillMissing(paymentIds) {
    console.log(`Starting backfill for ${paymentIds.length} payments...`);
    
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    for (const paymentId of paymentIds) {
        try {
            console.log(`Processing ${paymentId}...`);
            
            // 1. Fetch from Razorpay
            const payment = await rzp.payments.fetch(paymentId);
            
            // 2. Map to ledger schema
            const record = {
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
                raw_payload: payment,
                last_synced_at: new Date().toISOString()
            };

            // 3. Upsert to Supabase
            const { error } = await supabase
                .from('razorpay_ledger')
                .upsert(record, { onConflict: 'payment_id' });

            if (error) {
                throw error;
            }

            console.log(`✅ Successfully backfilled ${paymentId}`);
            results.success++;
        } catch (err) {
            console.error(`❌ Failed to backfill ${paymentId}:`, err.message);
            results.failed++;
            results.errors.push(`${paymentId}: ${err.message}`);
        }
    }

    console.log(`\nBackfill complete!`);
    console.log(`Success: ${results.success}`);
    console.log(`Failed: ${results.failed}`);
    if (results.errors.length > 0) {
        console.log(`Errors:`, results.errors);
    }
}

// List of unique payment IDs from the previous search (manual extraction for now, or I can automate)
const missingPaymentIds = [
    'pay_SnXnV9JQTNHPiI', 'pay_SnXVzTRpwWBF6k', 'pay_SnXKXqWTcKzIig', 'pay_SnVuzbC5wk4h7n',
    'pay_SnVb6YEJQkHsY6', 'pay_SnVTdF1hKQu7v0', 'pay_SnJjrpjcBYhAYW', 'pay_SmvVwZSnx3aYXD',
    'pay_SlkFXRebrrdoYF', 'pay_SkgLdUx1jtfhKv', 'pay_SkQExqPbjoECpG', 'pay_SkPGNIRwGQa4wZ',
    'pay_SkKlFyIyPXplWV', 'pay_Sk02uctrZ4eWBP', 'pay_SjxfNEQ7NoJc7Z', 'pay_SjxUWlTkBRbcnb',
    'pay_Sjkq77atCk24rf', 'pay_Sjix9l0PXxJSJ9', 'pay_SjEEZIoqEflfJU', 'pay_SjB38iWfCVNbBe',
    'pay_Si9reRAJJsVZDy', 'pay_SfyNwc7UIH6y0B', 'pay_SfQnUadgpgaBWA', 'pay_SfE4vtuArZ6C0a',
    'pay_SfE2cXsYi0wu4i', 'pay_SfD0fz1FyrbBIK', 'pay_SfCzAja9vRJalG', 'pay_Sf1ZNjBMXhERsT'
];

// Remove duplicates
const uniqueIds = [...new Set(missingPaymentIds)];

backfillMissing(uniqueIds);
