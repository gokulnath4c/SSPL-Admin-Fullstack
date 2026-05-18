require('dotenv').config({ path: __dirname + '/../.env.production' });
const { sendEmail } = require('../services/email-service.cjs');

async function testAttachment() {
    console.log('📎 Testing Email Attachment...');
    const testEmail = 'support@ssplt10.com'; // Self-test or safe email

    // Create a simple text file as base64
    const content = Buffer.from('Hello this is a test attachment content.').toString('base64');

    const attachment = {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: 'test-attachment.txt',
        contentType: 'text/plain',
        contentBytes: content
    };

    try {
        const res = await sendEmail({
            to: testEmail,
            subject: 'Test Email with Attachment',
            html: '<h1>Attachment Test</h1><p>Please find attached.</p>',
            text: 'Please find attached.',
            attachments: [attachment]
        });

        if (res.success) {
            console.log('✅ Attachment Email Sent Successfully!');
        } else {
            console.error('❌ Failed:', res.error);
        }
    } catch (err) {
        console.error('❌ Exception:', err);
    }
}

testAttachment();
