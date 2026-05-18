import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'admin/react-app/server/.env') });

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
console.log('Env Check:', { URL: SUPABASE_URL, KeyLength: SUPABASE_SERVICE_ROLE_KEY?.length });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const EXCEL_PATH = 'C:\\Users\\ADMIN\\Downloads\\Potential Call List v1.xlsx';
const STOP_NUMBER = '9973057972';

async function importCampaign() {
    console.log(`\n🚀 Starting Bulk Import from: ${EXCEL_PATH}`);

    try {
        // 1. Fetch Existing Numbers for De-duplication
        console.log('🔍 Fetching existing contacts for de-duplication...');
        const { data: candidates } = await supabase.from('trial_candidates').select('mobile');
        const { data: registrations } = await supabase.from('player_registrations').select('mobile');
        
        const existingSet = new Set([
            ...(candidates || []).map(x => String(x.mobile).replace(/\D/g, '').slice(-10)),
            ...(registrations || []).map(x => String(x.mobile).replace(/\D/g, '').slice(-10))
        ]);
        console.log(`✅ Loaded ${existingSet.size} unique existing numbers.`);

        // 2. Read Excel
        console.log('📄 Reading Excel file...');
        const fileBuffer = fs.readFileSync(EXCEL_PATH);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // Remove header row
        const dataRows = rows.slice(1);
        console.log(`📊 Total rows in Excel: ${dataRows.length}`);

        // 3. Create Campaign
        const campaignData = {
            name: 'Potential Call List v1 (Resumed)',
            message_template: 'Hi! This is Team SSPL. We are excited to have you with us. Please stay tuned for updates regarding your cricket trials.',
            status: 'READY',
            instance_name: 'sspl_admin',
            daily_limit: 2500,
            batch_size: 50,
            min_delay_seconds: 60,
            max_delay_seconds: 180,
            created_at: new Date().toISOString()
        };

        const { data: campaign, error: cError } = await supabase
            .from('whatsapp_campaigns')
            .insert(campaignData)
            .select()
            .single();

        if (cError) throw new Error(`Campaign creation failed: ${cError.message}`);
        console.log(`✅ Created campaign: ${campaign.id}`);

        // 4. Process and Batch Insert Recipients
        console.log('⚙️  Processing recipients...');
        const recipients = [];
        let hasReachedStop = false;
        let duplicateCount = 0;

        for (const row of dataRows) {
            const rawPhone = String(row[0] || '').replace(/\D/g, '');
            if (!rawPhone) continue;

            const phone10 = rawPhone.slice(-10);
            
            // De-duplication
            if (existingSet.has(phone10)) {
                duplicateCount++;
                continue;
            }

            const status = hasReachedStop ? 'PENDING' : 'SENT';
            
            recipients.push({
                campaign_id: campaign.id,
                mobile: rawPhone.length === 10 ? '91' + rawPhone : rawPhone,
                name: 'Candidate',
                status: status,
                sent_at: status === 'SENT' ? new Date().toISOString() : null
            });

            // Check if this is the stop number
            if (phone10 === STOP_NUMBER) {
                console.log(`📍 Found stop number ${STOP_NUMBER}. Subsequent numbers will be PENDING.`);
                hasReachedStop = true;
            }
        }

        console.log(`✅ Prepared ${recipients.length} recipients (Filtered ${duplicateCount} duplicates).`);

        // 5. Batch Insert into Supabase
        const BATCH_SIZE = 1000;
        let inserted = 0;
        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);
            const { error: rError } = await supabase.from('whatsapp_campaign_recipients').insert(batch);
            if (rError) {
                console.error(`❌ Batch insert failed: ${rError.message}`);
            } else {
                inserted += batch.length;
                process.stdout.write(`\r📥 Imported ${inserted}/${recipients.length}... `);
            }
        }

        console.log(`\n\n🎉 ALL DONE!`);
        console.log(`-----------------------------`);
        console.log(`Total Scanned: ${dataRows.length}`);
        console.log(`Duplicates Skipped: ${duplicateCount}`);
        console.log(`Imported to DB: ${inserted}`);
        console.log(`Campaign ID: ${campaign.id}`);
        console.log(`-----------------------------`);

    } catch (err) {
        console.error(`\n❌ FATAL ERROR: ${err.message}`);
    }
}

importCampaign();
