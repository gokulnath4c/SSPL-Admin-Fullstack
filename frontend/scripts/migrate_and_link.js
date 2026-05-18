
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function migrate() {
    console.log("Starting Migration...");

    // 1. Fetch source data
    const { data: sourceData, error: srcError } = await supabase
        .from('trials_allocations') // Plural (Wrong table)
        .select('*');

    if (srcError) { console.error('Fetch Error:', srcError); return; }
    if (!sourceData || sourceData.length === 0) { console.log('No data to migrate.'); return; }

    console.log(`Found ${sourceData.length} records to migrate.`);

    // 2. Create Target Trial
    const trialName = 'Chennai Bulk Allocation';
    const today = new Date().toISOString().split('T')[0];

    // Check if exists
    let { data: trial, error: trialError } = await supabase
        .from('trials')
        .select('trial_id')
        .eq('trial_name', trialName)
        .single();

    let trialId = trial?.trial_id;

    if (!trialId) {
        console.log("Creating new Trial Event...");
        const { data: newTrial, error: createError } = await supabase
            .from('trials')
            .insert({
                trial_name: trialName,
                trial_date: today,
                trial_venue: 'Chennai (Manual Allocation)',
                trial_batch: 'Bulk Batch',
                trial_capacity: 500,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (createError) { console.error('Trial Create Error:', createError); return; }
        trialId = newTrial.trial_id;
    }

    console.log(`Using Trial ID: ${trialId}`);

    // 3. Prepare Target Data
    // Map source -> target
    // trials_allocations might have columns: allocation_id, workflow_id, trial_id, ...
    // trial_allocations needs: trial_id, workflow_id, allocation_date, selection_status, attendance_status

    // Check existing in target to avoid dupes
    const workflowIds = sourceData.map(r => r.workflow_id);
    const { data: existing } = await supabase.from('trial_allocations').select('workflow_id').in('workflow_id', workflowIds);
    const existingSet = new Set(existing?.map(e => e.workflow_id));

    const recordsToInsert = sourceData
        .filter(r => !existingSet.has(r.workflow_id))
        .map(r => ({
            trial_id: trialId,
            workflow_id: r.workflow_id,
            allocation_date: r.allocation_date || today,
            attendance_status: 'pending',
            selection_status: 'pending',
            created_at: new Date().toISOString()
        }));

    console.log(`New records to insert: ${recordsToInsert.length}`);

    if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
            .from('trial_allocations') // Singular (Correct table)
            .insert(recordsToInsert);

        if (insertError) console.error('Insert Error:', JSON.stringify(insertError, null, 2));
        else console.log("Migration Successful!");
    } else {
        console.log("All records already exist in target table.");
    }

    // 4. Update workflow stage again just in case
    const { error: updateError } = await supabase
        .from('player_workflow')
        .update({ workflow_stage: 'trials_allocated' })
        .in('workflow_id', workflowIds);

    if (updateError) console.log("Stage update warning:", updateError);
    else console.log("Workflow stages verified.");

}

migrate();
