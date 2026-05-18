const fs = require('fs');
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const twilioService = require('../services/twilioService.cjs');

const EXCEL_PATH = 'C:/Users/ADMIN/Downloads/Call for Whatsapp.xlsx';

const MESSAGE_TEMPLATE = `🏏 SSPL TRIALS – COIMBATORE 🏏

Dear {NAME} 💥

Your SSPL trial is confirmed! Get ready to prove yourself 🔥

📍 Venue:
Marutham Sports Arena
119/2C, behind Chidvikas Vidya Mandir,
Kamadenu Nagar, Vadavalli, Coimbatore

📍 Location:
https://share.google/eYPOdUvH90ElbGkz3

🗓 Date: Sunday, 03 May 2026
🕘 Time: {SLOT_TIMING}

⚠️ Important Instructions:

✅ Reach 30 mins early
✅ Wear proper cricket jersey + track pants + shoes
✅ Bring your own bat & kit (No Sri Lankan / fiber bats)
✅ Tennis balls will be provided

🎯 This is your moment. Don’t miss it. Show your game.`;

async function main() {
    const env = fs.readFileSync('.env.production', 'utf8');
    const urlMatch = env.match(/VITE_SUPABASE_URL="(.*?)"/);
    const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=([\w\-\.]+)/);
    
    const supabase = createClient(urlMatch[1], keyMatch[1]);
    
    // Load Excel Data
    const excelData = xlsx.readFile(EXCEL_PATH);
    const rows = xlsx.utils.sheet_to_json(excelData.Sheets[excelData.SheetNames[0]]);
    console.log(`Loaded ${rows.length} records from Excel.`);

    // Fetch DB Data for matching
    let regs = [];
    let from = 0;
    while(true) {
        const { data } = await supabase.from('player_registrations').select('mobile,email,full_name,player_name').range(from, from + 999);
        if(!data || data.length === 0) break;
        regs = regs.concat(data);
        from += 1000;
    }
    const { data: trials } = await supabase.from('trial_view').select('mobile,email,name');
    
    // Create mapping
    const playerMap = {};
    const addToMap = (item) => {
        const name = item.full_name || item.player_name || item.name;
        if(!name) return;
        if(item.mobile) playerMap[String(item.mobile).replace(/\D/g, '').slice(-10)] = name;
        if(item.email) playerMap[String(item.email).toLowerCase().trim()] = name;
    };
    regs.forEach(addToMap);
    if(trials) trials.forEach(addToMap);

    console.log("Starting Twilio messaging campaign...");

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const mobile = row['Mobile No.'] ? String(row['Mobile No.']).replace(/\D/g, '').slice(-10) : null;
        const email = row['Email ID'] ? String(row['Email ID']).toLowerCase().trim() : null;
        const timing = row['SLOT TIMING'] || "9 AM - 10 AM";
        
        const playerName = (mobile && playerMap[mobile]) || (email && playerMap[email]) || "Hero";
        const messageText = MESSAGE_TEMPLATE.replace('{NAME}', playerName).replace('{SLOT_TIMING}', timing);
        const targetMobile = mobile ? `91${mobile}` : null;

        if (!targetMobile) continue;

        console.log(`[${i+1}/${rows.length}] Sending to ${playerName} (${targetMobile})...`);
        
        try {
            await twilioService.sendMessage(targetMobile, messageText);
            console.log("   ✅ Success");
        } catch (e) {
            console.error(`   ❌ Failed: ${e.message}`);
        }

        // Small delay to avoid Twilio rate limits in sandbox
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("🎉 Campaign Completed.");
}

main();
