const cron = require('node-cron');
const supabase = require('../config/supabase.cjs');
const { sendEmail } = require('../services/email-service.cjs');

// Email Template
const EMAIL_SUBJECT = "Final Reminder: Immediate Action Required";
const EMAIL_HTML = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <p>Dear Player,</p>

     <div style="background-color: #fef2f2; border-left: 5px solid #ef4444; padding: 15px; margin: 20px 0;">
        <h2 style="margin: 0; color: #ef4444; font-size: 18px; font-weight: bold;">🚨 Final Reminder – Immediate Action Required 🚨</h2>
    </div>

    <p>According to our records, your <strong>SSPL trial registration payment is still pending</strong>, due to which your slot has not been confirmed.</p>

    <p>Southern Street Premier League (SSPL) is India’s largest tennis ball cricket league, where selection is based purely on performance — not luck.</p>

    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0f172a;">🔥 What Makes SSPL Special</p>
        <ul style="margin: 0; padding-left: 20px; list-style-type: none;">
            <li style="margin-bottom: 5px;">✅ All 3 Levels of selection conducted in a single day</li>
            <li style="margin-bottom: 5px;">✅ 100% Performance-Based Selection</li>
            <li>✅ One day. One opportunity. A chance to change your career.</li>
        </ul>
    </div>



    <p style="color: #b91c1c; font-weight: bold;">⚠️ Your slot will be confirmed only after payment.</p>
    <p>Complete your payment immediately before this opportunity slips away.</p>

    <p style="text-align: center; margin: 30px 0;">
        <a href="https://www.ssplt10.co.in/register" style="display: inline-block; background-color: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Register Now</a>
    </p>

    <p style="font-style: italic; color: #555; text-align: center;">
        "The decision you make today could take you to international stadiums tomorrow."
    </p>

    <p style="margin-top: 30px;">👉 If you have already completed your registration, please ignore this message.</p>

    <p>📲 For assistance, call or WhatsApp: <strong>8807775960</strong></p>

    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
        <p style="margin: 0; font-weight: bold;">Warm regards,</p>
        <p style="margin: 5px 0 0 0;">Team SSPL</p>
        <p style="margin: 0; color: #666; font-size: 14px;">Southern Street Premier League</p>
    </div>
</div>
`;

const EMAIL_TEXT = `Dear Player,

🚨 Final Reminder – Immediate Action Required 🚨

According to our records, your SSPL trial registration payment is still pending, due to which your slot has not been confirmed.

Southern Street Premier League (SSPL) is India’s largest tennis ball cricket league, where selection is based purely on performance — not luck.

🔥 What Makes SSPL Special
✅ All 3 Levels of selection conducted in a single day
✅ 100% Performance-Based Selection
✅ One day. One opportunity. A chance to change your career.


⚠️ Your slot will be confirmed only after payment.
Complete your payment immediately before this opportunity slips away.

Register Now: https://www.ssplt10.co.in/register

"The decision you make today could take you to international stadiums tomorrow."

👉 If you have already completed your registration, please ignore this message.

📲 For assistance, call or WhatsApp: 8807775960

Warm regards,
Team SSPL
Southern Street Premier League
`;

async function checkAndSendReminders(customStartTime = null, customEndTime = null) {
    console.log('⏳ Checking for failed payments to send reminders...');

    const now = new Date();
    // Default: Created between 30 mins and 90 mins ago
    const startTime = customStartTime || new Date(now.getTime() - 90 * 60 * 1000).toISOString();
    const endTime = customEndTime || new Date(now.getTime() - 30 * 60 * 1000).toISOString();

    try {
        // 1. Get potential candidates (failed or created status)
        // We look for 'created' too because sometimes they drop off before failure response
        const { data: candidates, error } = await supabase
            .from('razorpay_ledger')
            .select('email, contact, status, created_at, payment_id')
            .or('status.eq.failed,status.eq.created')
            .gte('created_at', startTime)
            .lte('created_at', endTime);

        // 2. Also get pending registrations from player_registrations (users who dropped off)
        const { data: pendingRegs, error: regError } = await supabase
            .from('player_registrations')
            .select('email, phone, payment_status, created_at') // mapped phone to contact logic
            .eq('payment_status', 'pending')
            .gte('created_at', startTime)
            .lte('created_at', endTime);

        if (error) throw error;
        if (regError) console.error('Error fetching pending registrations:', regError);

        const safeCandidates = candidates || [];
        const safePendingRegs = pendingRegs || [];

        if (safeCandidates.length === 0 && safePendingRegs.length === 0) {
            console.log('✅ No pending/failed payments found in the target window.');
            return;
        }

        // Merge lists (normalize structure)
        const combined = [
            ...safeCandidates.map(c => ({ email: c.email, contact: c.contact, source: 'razorpay' })),
            ...safePendingRegs.map(c => ({ email: c.email, contact: c.phone, source: 'registration' }))
        ];

        console.log(`🔍 Found ${combined.length} candidates (${safeCandidates.length} RZPay, ${safePendingRegs.length} Regs). Verifying eligibility...`);

        // Group by email to avoid sending multiple emails if they tried multiple times
        // Filter out those without valid email
        const uniqueEmails = [...new Set(combined.map(c => c.email).filter(e => e && e.includes('@')))];

        for (const email of uniqueEmails) {
            // 2. Eligibility Check

            // A. Check if they have ANY successful payment in the last 24 hours (or ever, but 24h is safe context)
            const { data: successes, error: successError } = await supabase
                .from('razorpay_ledger')
                .select('payment_id')
                .eq('email', email)
                .or('status.eq.captured,status.eq.authorized')
                .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

            if (successError) {
                console.error(`Error checking success for ${email}:`, successError);
                continue;
            }

            if (successes && successes.length > 0) {
                console.log(`⏩ Skipping ${email}: Has successfull payment.`);
                continue;
            }

            // B. Check if we ALREADY sent a reminder in the last 24 hours
            const { data: logs, error: logError } = await supabase
                .from('email_logs')
                .select('id')
                .eq('recipient_email', email)
                .eq('email_type', 'payment_reminder')
                .gte('sent_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

            if (logError) {
                console.error(`Error checking logs for ${email}:`, logError);
                continue;
            }

            if (logs && logs.length > 0) {
                console.log(`⏩ Skipping ${email}: Already sent reminder recently.`);
                continue;
            }

            // 3. Send Email
            console.log(`📧 Sending Reminder to ${email}...`);
            const res = await sendEmail({
                to: email,
                subject: EMAIL_SUBJECT,
                html: EMAIL_HTML,
                text: EMAIL_TEXT
            });

            // Determine source for logging
            // We need to find the candidate object again to get the source
            const candidate = combined.find(c => c.email === email);
            const sourceLabel = candidate?.source === 'registration' ? 'Pending Registration' : 'Failed Payment';

            // 4. Log Result
            await supabase.from('email_logs').insert({
                recipient_email: email,
                recipient_name: sourceLabel, // Using this field to store the "Reason/Source"
                email_type: 'payment_reminder',
                status: res.success ? 'success' : 'failed',
                error_message: res.success ? null : res.error,
                sent_at: new Date().toISOString()
            });
        }

    } catch (err) {
        console.error('❌ Error in payment reminder cron:', err);
    }
}

const initPaymentReminders = () => {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', () => checkAndSendReminders());
    console.log('📅 Payment Reminder Job Scheduled (Every 30 mins)');
};

module.exports = { checkAndSendReminders, initPaymentReminders };
