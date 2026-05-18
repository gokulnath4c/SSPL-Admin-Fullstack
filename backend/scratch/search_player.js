require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

async function search() {
    const phone = '9087997975';
    console.log('Searching for phone:', phone);

    // 1. Registration Info
    const { data: regs, error: regError } = await supabase
        .from('player_registrations')
        .select('*')
        .or(`phone.ilike.%${phone}%,phone.ilike.%91${phone}%`);

    if (regError) {
        console.error('Registration Error:', regError);
        return;
    }

    if (!regs || regs.length === 0) {
        console.log('No registrations found for this number.');
        return;
    }

    console.log(`Found ${regs.length} registrations.`);
    console.log('--- Registration Details ---');
    regs.forEach(r => {
        console.log(`ID: ${r.id}`);
        console.log(`Name: ${r.full_name}`);
        console.log(`Status: ${r.payment_status}`);
        console.log(`---`);
    });

    const regIds = regs.map(r => r.id);

    // 2. Trial Results / Assessments
    // Trying common tables like trial_candidates, assessments, etc.
    const { data: trials, error: trialError } = await supabase
        .from('trial_candidates')
        .select('*')
        .in('registration_id', regIds);

    if (trialError) {
        console.error('Trial Candidates Error:', trialError);
    } else if (trials && trials.length > 0) {
        console.log('\n--- Trial Results ---');
        console.log(JSON.stringify(trials, null, 2));
    } else {
        console.log('\nNo trial data found for these registrations.');
    }
    
    // Also try joining with assessments if applicable
    const { data: assessments, error: assError } = await supabase
        .from('assessments')
        .select('*')
        .in('registration_id', regIds);
        
    if (!assError && assessments && assessments.length > 0) {
        console.log('\n--- Assessments ---');
        console.log(JSON.stringify(assessments, null, 2));
    }
}

search();
