import { evolutionClient } from './evolution-client.js';
import dotenv from 'dotenv';
dotenv.config();

const INSTANCE = 'sspl_admin';
const TEST_NUMBER = '919150247561'; // User's test number from earlier scripts

async function diagnose() {
    try {
        console.log(`Sending test text message to ${TEST_NUMBER}...`);
        const result = await evolutionClient.sendText(INSTANCE, TEST_NUMBER, 'SSPL Diagnostic Test');
        console.log('Text Success:', result);
    } catch (err) {
        console.error('Text Error:', err.status, JSON.stringify(err.data, null, 2));
    }

    try {
        console.log(`\nSending test BUTTON message to ${TEST_NUMBER}...`);
        const result = await evolutionClient.sendButtons(INSTANCE, TEST_NUMBER, 'Test Title', 'Test Description', 'Test Footer', [
            { type: 'url', text: 'Register', url: 'https://ssplt10.co.in' }
        ]);
        console.log('Buttons Success:', result);
    } catch (err) {
        console.error('Buttons Error:', err.status, JSON.stringify(err.data, null, 2));
    }
}

diagnose();
