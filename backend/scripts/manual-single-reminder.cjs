require('dotenv').config({ path: __dirname + '/../.env.production' });
const { sendEmail } = require('../services/email-service.cjs');

// Copied from cron/payment-reminders.cjs to ensure exact consistency
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

async function main() {
    const targetEmail = 'gokulnath.4c@gmail.com';
    console.log(`📧 Sending single manual reminder to ${targetEmail}...`);

    const res = await sendEmail({
        to: targetEmail,
        subject: EMAIL_SUBJECT,
        html: EMAIL_HTML,
        text: EMAIL_TEXT
    });

    if (res.success) {
        console.log('✅ Email sent successfully!');
    } else {
        console.error('❌ Failed to send email:', res.error);
    }
}

main();
