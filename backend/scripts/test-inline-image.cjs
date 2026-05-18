require('dotenv').config({ path: __dirname + '/../.env.production' });
const { sendEmail } = require('../services/email-service.cjs');

async function testInlineImage() {
    console.log('🖼️ Testing Inline Embedded Image...');
    const testEmail = 'support@ssplt10.com'; // Self-test or safe email

    // Create a simple text file as base64 (pretending to be an image for structure test)
    // Real image base64 would be long.
    const content = Buffer.from('fake-image-data').toString('base64');
    const contentId = 'my-test-image-id';

    const attachment = {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: 'test-image.png',
        contentType: 'image/png',
        contentBytes: content,
        isInline: true,
        contentId: contentId
    };

    const htmlBody = `
        <h1>Inline Image Test</h1>
        <p>There should be an image below:</p>
        <img src="cid:${contentId}" style="border: 2px solid red;" width="100" height="100" />
        <p>End of email.</p>
    `;

    try {
        const res = await sendEmail({
            to: testEmail,
            subject: 'Test Email with Inline Image',
            html: htmlBody,
            text: 'This email requires HTML to view the image.',
            attachments: [attachment]
        });

        if (res.success) {
            console.log('✅ Inline Image Email Sent Successfully!');
        } else {
            console.error('❌ Failed:', res.error);
        }
    } catch (err) {
        console.error('❌ Exception:', err);
    }
}

testInlineImage();
