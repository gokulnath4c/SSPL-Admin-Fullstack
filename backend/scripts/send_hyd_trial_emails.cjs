require('dotenv').config({ path: __dirname + '/../.env.production' });
const fs = require('fs');
const XLSX = require('xlsx');
const { sendBulkEmail } = require('../services/email-service.cjs');

const EXCEL_PATH = 'C:\\Users\\ADMIN\\Downloads\\TELANGANA-HYD Level 2 Level 3 Call for List.xlsx';

function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function buildHTMLBody() {
    return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#0f172a;color:#1e293b;margin:0;padding:0">
    <table width="100%" bgcolor="#0f172a" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <table width="600" bgcolor="#ffffff" style="margin:20px auto;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5)">
                    <tr>
                        <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 40%,#065f46 100%);padding:40px 30px;text-align:center">
                            <h1 style="margin:0;font-size:28px;font-weight:800;color:#fff;letter-spacing:2px;text-transform:uppercase">SSPL T10</h1>
                            <p style="margin:6px 0 0;font-size:14px;color:#86efac;letter-spacing:3px;text-transform:uppercase;font-weight:500">
                                India's Premier T10 Tennis Ball Cricket League
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background:#111827;padding:30px;color:#cbd5e1;line-height:1.6;font-size:16px">
                            <h2 style="color:#f8fafc;margin-top:0">Dear Hero 🔥</h2>
                            <p>Greetings from SSPL!</p>
                            <p>Congratulations — you have been selected for the next level of Trials.</p>
                            <p>Your moment is here, where only the best rise 💪</p>
                            
                            <div style="background:#1e293b;padding:20px;border-radius:12px;margin:20px 0;border-left:4px solid #10b981">
                                <p style="margin:0"><strong>Date:</strong> <span style="color:#f8fafc">April 12th, 2026</span></p>
                                <p style="margin:8px 0 0"><strong>Time:</strong> <span style="color:#f8fafc">You can attend anytime between 9:00 AM to 5:00 PM (please ensure your Attendance)</span></p>
                                <p style="margin:8px 0 0"><strong>Venue:</strong> <span style="color:#f8fafc">JS Sports Arena, Shanti Nagar Colony, Deepthisri Nagar, Madeenaguda, Hyderabad, Telangana 500049</span></p>
                            </div>

                            <div style="margin-top:20px;text-align:center">
                                <a href="https://share.google/ClTFdIEx3j9JNgsoE" target="_blank" style="display:inline-block;background:#059669;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06)">📍 View Location on Map</a>
                            </div>

                            <p style="margin-top:25px;color:#f8fafc;font-weight:bold;">Be ready. Be sharp. Give it everything.</p>
                            <p>We’ll be watching. See you on the field!</p>
                            
                            <div style="background:#0f172a;padding:15px;border-radius:8px;margin-top:20px;font-size:14px">
                                <p style="margin:0;color:#10b981">✅ Kindly reply with “OK” to confirm your slot.</p>
                                <p style="margin:10px 0 0;color:#ef4444">❗ If you are unable to attend you are postponing your success till next season. If you have any doubts, please WhatsApp us at <strong style="color:#fff">8807775960</strong>.</p>
                            </div>

                            <p style="margin-top:30px;color:#94a3b8">
                                Best regards,<br>
                                <strong style="color:#f8fafc">Team SSPL</strong>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

async function run() {
    console.log("Reading EXCEL file...");
    const buf = fs.readFileSync(EXCEL_PATH);
    const wb = XLSX.read(buf);

    if (!wb.SheetNames.includes('SELECTED PLAYER LIST')) {
        console.error("ERROR: SELECTED PLAYER LIST sheet not found.");
        process.exit(1);
    }

    const ws = wb.Sheets['SELECTED PLAYER LIST'];
    const data = XLSX.utils.sheet_to_json(ws);

    // Extract valid emails
    const emails = data
        .map(r => r['Email ID'])
        .filter(email => email && typeof email === 'string' && email.includes('@'))
        .map(email => email.trim());

    // Deduplicate
    const uniqueEmails = [...new Set(emails)];

    console.log(`Found ${uniqueEmails.length} unique emails from 'SELECTED PLAYER LIST' sheet.`);
    console.log("Starting dispatch via MS Graph...");

    const subject = "🏏 SSPL Trials (Level 2 & 3) — Call for Hyderabad! Action Required";
    const body = buildHTMLBody();

    const result = await sendBulkEmail(uniqueEmails, subject, body);

    console.log("=== BATCH COMPLETE ===");
    console.log("Success:", result.success);
    console.log("Failed:", result.failed);
}

run().then(() => {
    console.log("Script finished successfully. Check Admin Bulk Email History.");
    process.exit(0);
}).catch(err => {
    console.error("Critical Error:", err);
    process.exit(1);
});
