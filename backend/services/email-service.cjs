require('dotenv').config({ path: __dirname + '/../.env.production' });
const fetch = require('node-fetch');
const supabase = require('../config/supabase.cjs');

// Cache token simply
let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
    // If token is valid (with 5 min buffer), return it
    if (accessToken && Date.now() < tokenExpiry - 300000) {
        return accessToken;
    }

    const tenantId = process.env.MSGRAPH_TENANT_ID;
    const clientId = process.env.MSGRAPH_CLIENT_ID;
    const clientSecret = process.env.MSGRAPH_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
        throw new Error('Missing Microsoft Graph credentials');
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: params
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`Auth Error: ${data.error_description || data.error}`);
        }

        accessToken = data.access_token;
        // expires_in is in seconds
        tokenExpiry = Date.now() + (data.expires_in * 1000);
        return accessToken;

    } catch (err) {
        console.error('Failed to get MS Graph Access Token:', err);
        throw err;
    }
}

async function sendEmail({ to, subject, html, text, attachments }) {
    try {
        const token = await getAccessToken();
        const fromEmail = process.env.MSGRAPH_FROM_EMAIL;

        if (!fromEmail) throw new Error('MSGRAPH_FROM_EMAIL is not configured');

        const message = {
            message: {
                subject: subject,
                body: {
                    contentType: html ? 'HTML' : 'Text',
                    content: html || text
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: to
                        }
                    }
                ],
                attachments: (attachments || []).map(att => ({
                    '@odata.type': '#microsoft.graph.fileAttachment',
                    name: att.name,
                    contentType: att.contentType,
                    contentBytes: att.contentBytes,
                    isInline: att.isInline || false,
                    contentId: att.contentId || null
                }))
            },
            saveToSentItems: 'false'
        };

        const url = `https://graph.microsoft.com/v1.0/users/${fromEmail}/sendMail`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Graph API Error: ${response.status} ${JSON.stringify(errorData)}`);
        }

        return { success: true };

    } catch (error) {
        console.error('Error sending email via Graph API:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send bulk email using a pool
 * Simple iteration for now, to avoid rate limits
 */
async function sendBulkEmail(recipients, subject, htmlContent, attachments = []) {
    const results = {
        success: 0,
        failed: 0,
        successful: [], // Array of strings
        errors: []      // Array of { email, error }
    };

    console.log(`Starting bulk email to ${recipients.length} recipients via MS Graph...`);
    if (attachments.length > 0) console.log(`📎 With ${attachments.length} attachments`);

    // MS Graph Rate Limits are stricter than SMTP usually.
    // 429 Errors indicate we are sending too much data too fast (e.g. large attachments).
    // Serial processing (Chunk Size 1) is safest for attachments.
    const chunkSize = 1;
    for (let i = 0; i < recipients.length; i += chunkSize) {
        const chunk = recipients.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (email) => {
            const res = await sendEmail({
                to: email,
                subject,
                html: htmlContent,
                text: htmlContent.replace(/<[^>]*>?/gm, ""),
                attachments
            });
            if (res.success) {
                results.success++;
                results.successful.push(email);
            } else {
                results.failed++;
                results.errors.push({ email, error: res.error });
            }

            // Log to database (fire and forget or await? await to be safe)
            try {
                await supabase.from('email_logs').insert({
                    recipient_email: email,
                    recipient_name: email.split('@')[0],
                    email_type: 'bulk_campaign',
                    status: res.success ? 'success' : 'failed',
                    error_message: res.success ? null : res.error,
                    sent_at: new Date().toISOString()
                });
            } catch (logErr) {
                console.error('Failed to log email:', logErr);
            }
        }));
        // Delay to respect rate limits
        await new Promise(r => setTimeout(r, 2000));
    }

    return results;
}

module.exports = {
    sendEmail,
    sendBulkEmail
};
