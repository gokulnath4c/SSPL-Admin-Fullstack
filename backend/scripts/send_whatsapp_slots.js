const xlsx = require('xlsx');
const path = require('path');

const evolutionService = require('../services/evolutionService.cjs');

const EXCEL_PATH = 'C:\\Users\\ADMIN\\Downloads\\Call for Whatsapp.xlsx';
const INSTANCE_NAME = process.argv[2]; // Accept instance name from command line arguments

// Configure delay (in milliseconds)
const MIN_DELAY = 8000;  // 8 seconds
const MAX_DELAY = 15000; // 15 seconds
const BATCH_SIZE = 20;   // Take a longer pause after this many messages
const BATCH_PAUSE = 60000; // 60 seconds pause between batches

const MESSAGE_TEMPLATE = `🏏 SSPL TRIALS – VIJAYAWADA 🏏

Dear Hero 💥

Your SSPL trial is confirmed! Get ready to prove yourself 🔥

📍 Venue:
Sportive, Vijayawada

📍 Location:
https://maps.app.goo.gl/Hk4dtBdd9bpdDR1z7?g_st=iwb

🗓 Date: Sunday, 10 May 2026
🕘 Time: {SLOT_TIMING}

⚠️ Important Instructions:

✅ Reach 30 mins early
✅ Wear proper cricket jersey + track pants + shoes
✅ Bring your own bat & kit (No Sri Lankan / fiber bats)
✅ Tennis balls will be provided

🎯 This is your moment. Don’t miss it. Show your game.`;

function formatPhoneNumber(number) {
    let numStr = String(number).trim().replace(/\D/g, '');
    if (numStr.length === 10) {
        return `91${numStr}`;
    }
    return numStr;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function start() {
    if (!INSTANCE_NAME) {
        console.error('❌ Error: Please provide the WhatsApp Instance Name as an argument.');
        console.log('Usage: node send_whatsapp_slots.js <instance_name>');
        process.exit(1);
    }

    console.log(`🚀 Starting WhatsApp automation using instance: ${INSTANCE_NAME}`);
    
    try {
        // Test instance connection
        const status = await evolutionService.getConnectionState(INSTANCE_NAME);
        if (status?.instance?.state !== 'open') {
            console.warn(`⚠️ Warning: Instance state is ${status?.instance?.state || 'unknown'}. Ensure your WhatsApp is connected.`);
        }
    } catch (e) {
        console.error('❌ Failed to connect to Evolution API:', e.message);
        process.exit(1);
    }

    let data;
    try {
        const workbook = xlsx.readFile(EXCEL_PATH);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = xlsx.utils.sheet_to_json(worksheet);
        console.log(`✅ Loaded ${data.length} records from Excel.`);
    } catch (e) {
        console.error('❌ Failed to read Excel file:', e.message);
        process.exit(1);
    }

    const START_INDEX = parseInt(process.argv[3]) || 0;
    if (START_INDEX > 0) {
        console.log(`⏩ Resuming from record index ${START_INDEX}...`);
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = START_INDEX; i < data.length; i++) {
        const row = data[i];
        const rawMobile = row['Mobile No.'];
        const slotTiming = row['SLOT TIMING'];

        if (!rawMobile || !slotTiming) {
            console.warn(`⚠️ Skipping row ${i + 1}: Missing Mobile No. or SLOT TIMING`);
            continue;
        }

        const formattedMobile = formatPhoneNumber(rawMobile);
        const messageText = MESSAGE_TEMPLATE.replace('{SLOT_TIMING}', slotTiming);

        console.log(`[${i + 1}/${data.length}] Sending to ${formattedMobile} (Slot: ${slotTiming})...`);

        try {
            // Send message using backend evolutionService
            await evolutionService.sendMessage(INSTANCE_NAME, formattedMobile, messageText);
            console.log(`   ✅ Success`);
            successCount++;
        } catch (e) {
            console.error(`   ❌ Failed: ${e.message}`);
            failCount++;
        }

        if (i < data.length - 1) {
            if ((i + 1) % BATCH_SIZE === 0) {
                console.log(`⏸️ Batch of ${BATCH_SIZE} reached. Pausing for ${BATCH_PAUSE / 1000} seconds to avoid bans...`);
                await sleep(BATCH_PAUSE);
            } else {
                const delayMs = getRandomDelay(MIN_DELAY, MAX_DELAY);
                console.log(`   ⏳ Waiting ${Math.round(delayMs / 1000)} seconds before next message...`);
                await sleep(delayMs);
            }
        }
    }

    console.log('--------------------------------------------------');
    console.log(`🎉 Finished processing all records.`);
    console.log(`📊 Summary: ${successCount} successful | ${failCount} failed.`);
}

start();
