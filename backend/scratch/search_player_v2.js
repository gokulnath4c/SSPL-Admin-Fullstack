require('dotenv').config({ path: './.env.production' });
const supabase = require('../config/supabase.cjs');

async function search() {
    const phone = '9087997975';
    const email = 'abdajith443@gmail.com';
    const namePart = 'Ajith';

    console.log(`--- Broad Search Summary ---`);
    console.log(`Target Phone: ${phone}`);
    console.log(`Target Email: ${email}`);
    console.log(`Target Name: ${namePart}`);

    // 1. Search Registrations
    const { data: regs } = await supabase
        .from('player_registrations')
        .select('*')
        .or(`phone.ilike.%${phone}%,email.ilike.%${email}%,full_name.ilike.%${namePart}%`);

    console.log(`\nRegistrations Found: ${regs ? regs.length : 0}`);
    if (regs && regs.length > 0) {
        regs.forEach(r => console.log(`- ${r.full_name} (${r.phone}) [ID: ${r.id}] status: ${r.payment_status}`));
    }

    // 2. Search Trial Candidates
    const { data: trials } = await supabase
        .from('trial_candidates')
        .select('*')
        .or(`phone.ilike.%${phone}%,email.ilike.%${email}%,full_name.ilike.%${namePart}%`);

    console.log(`\nTrial Candidates Found: ${trials ? trials.length : 0}`);
    if (trials && trials.length > 0) {
        trials.forEach(t => {
            console.log(`- ${t.full_name} (${t.phone}) [RegID: ${t.registration_id}]`);
            console.log(`  Marks/Data:`, JSON.stringify(t, null, 2));
        });
    }

    // 3. Search specifically for "Assessments" or "Trial Assessment Results"
    // Let's check table names again or try a common one
    const { data: assessments } = await supabase
        .from('trial_candidates') // Some systems put marks here
        .select('*')
        .or(`phone.ilike.%${phone}%`);
        
    // If we have a special table for marks, search it
    // Based on previous logs, 'trial_candidates' often contains columns like 'trials_level_1_status', 'marks', etc.
}

search();
