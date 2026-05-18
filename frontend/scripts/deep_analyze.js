
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyze() {
    console.log("Analyzing Data Integrity...");

    // 1. Get all allocations
    const { data: allocations, error: allocError } = await supabase
        .from('trials_allocations')
        .select('allocation_id, workflow_id');

    if (allocError) { console.error(allocError); return; }

    console.log(`Total Allocations: ${allocations.length}`);
    const workflowIds = allocations.map(a => a.workflow_id);

    // 2. Check Workflow Existence
    // We fetch all workflows that match these IDs
    const { data: workflows, error: wfError } = await supabase
        .from('player_workflow')
        .select('workflow_id, registration_id, workflow_stage')
        .in('workflow_id', workflowIds);

    if (wfError) { console.error(wfError); return; }

    console.log(`Matching Workflows Found: ${workflows.length}`);

    // Identify missing workflows
    const foundWfIds = new Set(workflows.map(w => w.workflow_id));
    const missingWf = workflowIds.filter(id => !foundWfIds.has(id));
    console.log(`Missing Workflows: ${missingWf.length}`);

    // Identify stage mismatch
    const wrongStage = workflows.filter(w => w.workflow_stage !== 'trials_allocated');
    console.log(`Workflows with wrong stage: ${wrongStage.length}`);

    // 3. Check Registrations
    const regIds = workflows.map(w => w.registration_id).filter(id => id);
    const { data: registrations, error: regError } = await supabase
        .from('player_registrations')
        .select('id')
        .in('id', regIds);

    if (regError) { console.error(regError); return; }

    console.log(`Matching Registrations Found: ${registrations.length}`);

    // Identify missing registrations
    const foundRegIds = new Set(registrations.map(r => r.id));
    const workflowsMissingReg = workflows.filter(w => !w.registration_id || !foundRegIds.has(w.registration_id));

    console.log(`Workflows with missing/invalid Registration link: ${workflowsMissingReg.length}`);

    // Summary of valid chain
    // Allocation -> Workflow (Stage Correct) -> Registration

    const validCount = workflows.filter(w =>
        w.workflow_stage === 'trials_allocated' &&
        w.registration_id &&
        foundRegIds.has(w.registration_id)
    ).length;

    console.log(`FULLY VALID CHAINS: ${validCount}`);
}

analyze();
