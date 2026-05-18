
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findDuplicates() {
    console.log("Analyzing for duplicates...");

    // Fetch all allocations with player details
    // We need to join player_registrations via player_workflow to get email/phone
    // But supabase-js join syntax is tricky for 3 levels deep if we don't have direct FKs set up perfectly in Types.
    // Let's fetch allocations, then fetch workflows, then registrations.
    // Or just fetch `player_workflow` which has the snapshot of email/phone usually?
    // In this system, `player_workflow` has `phone` and `email` columns too! Best to use those first.

    const { data: allocations, error } = await supabase
        .from('trial_allocations')
        .select(`
            allocation_id,
            workflow_id,
            created_at,
            player_workflow (
                workflow_id,
                email,
                phone,
                full_name,
                registration_id
            )
        `);

    if (error) { console.error(error); return; }

    console.log(`Total Allocations: ${allocations.length}`);

    const phoneMap = new Map(); // Normalized Phone -> [Records]
    const emailMap = new Map(); // Normalized Email -> [Records]

    allocations.forEach(r => {
        const wf = r.player_workflow;
        if (!wf) return;

        // Normalize
        const phone = wf.phone ? String(wf.phone).replace(/[^0-9]/g, '').slice(-10) : 'NO_PHONE';
        const email = wf.email ? wf.email.toLowerCase().trim() : 'NO_EMAIL';

        if (phone !== 'NO_PHONE') {
            if (!phoneMap.has(phone)) phoneMap.set(phone, []);
            phoneMap.get(phone).push({ ...r, key: phone, type: 'phone' });
        }

        if (email !== 'NO_EMAIL') {
            if (!emailMap.has(email)) emailMap.set(email, []);
            emailMap.get(email).push({ ...r, key: email, type: 'email' });
        }
    });

    let duplicateGroups = [];
    const seenAllocations = new Set();

    // Check Phones
    for (const [key, records] of phoneMap) {
        if (records.length > 1) {
            duplicateGroups.push(records);
            records.forEach(r => seenAllocations.add(r.allocation_id));
        }
    }

    // Check Emails (only if not already caught by phone)
    // Actually, overlapping groups might be complex. Let's just list all duplicates found.

    console.log(`Found ${duplicateGroups.length} duplicate groups by Phone.`);

    // Sort and Display specific examples
    let removableCount = 0;

    duplicateGroups.forEach((group, idx) => {
        // Sort by creation time (primary criterion: keep OLDEST, delete NEWEST?)
        // The user said "remove duplicates". Usually we keep the original.
        // The "original" 66 were likely created first (or migrated). 
        // My new import created records TODAY.

        group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        const keeper = group[0];
        const removers = group.slice(1);

        removableCount += removers.length;

        if (idx < 5) { // Show first 5 examples
            console.log(`\nGroup ${idx + 1} (${group[0].key}):`);
            console.log(`  KEEP: ${keeper.player_workflow.full_name} (Created: ${keeper.created_at})`);
            removers.forEach(dub => {
                console.log(`  DEL : ${dub.player_workflow.full_name} (Created: ${dub.created_at})`);
            });
        }
    });

    console.log(`\nTotal Records to Delete: ${removableCount}`);
}

findDuplicates();
