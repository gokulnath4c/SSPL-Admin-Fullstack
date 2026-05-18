
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function removeDuplicates() {
    console.log("Removing duplicates...");

    // 1. Fetch data
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

    const phoneMap = new Map();
    allocations.forEach(r => {
        const wf = r.player_workflow;
        if (!wf) return;
        const phone = wf.phone ? String(wf.phone).replace(/[^0-9]/g, '').slice(-10) : 'NO_PHONE';
        if (phone !== 'NO_PHONE') {
            if (!phoneMap.has(phone)) phoneMap.set(phone, []);
            phoneMap.get(phone).push(r);
        }
    });

    let idsToDelete = [];
    let workflowIdsToDelete = [];
    let regIdsToDelete = [];

    for (const [phone, records] of phoneMap) {
        if (records.length > 1) {
            // Sort by Date (Older = Keep, Newer = Delete)
            records.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            const keepers = records[0];
            const removers = records.slice(1);

            removers.forEach(dub => {
                idsToDelete.push(dub.allocation_id);
                // Also clean up the Workflow and Registration created by my import script
                workflowIdsToDelete.push(dub.workflow_id);
                if (dub.player_workflow?.registration_id) {
                    regIdsToDelete.push(dub.player_workflow.registration_id);
                }
            });
        }
    }

    console.log(`Found ${idsToDelete.length} duplicate allocations to remove.`);

    if (idsToDelete.length > 0) {
        // Delete Allocations
        const { data: delAllocData, error: delAllocError } = await supabase
            .from('trial_allocations')
            .delete()
            .in('allocation_id', idsToDelete)
            .select();

        if (delAllocError) console.error("Allocation Delete Error:", delAllocError);
        else console.log(`Deleted ${delAllocData?.length || 0} allocations.`);

        // Delete Workflows
        const { error: delWfError } = await supabase
            .from('player_workflow')
            .delete()
            .in('workflow_id', workflowIdsToDelete);

        if (delWfError) console.error("Workflow Delete Error:", delWfError);
        else console.log("Deleted duplicate workflows.");

        // Delete Registrations
        const { error: delRegError } = await supabase
            .from('player_registrations')
            .delete()
            .in('id', regIdsToDelete);

        if (delRegError) console.error("Registration Delete Error:", delRegError);
        else console.log("Deleted duplicate registrations.");
    }
}

removeDuplicates();
