const supabase = require('../config/supabase.cjs');

async function updatePlayerStatuses() {
    console.log('--- Starting Player Status Update ---');

    const playersToUpdate = [
        { mobile: '9524262728', name: '(Existing Player)' },
        { mobile: '9047464212', name: 'Jeyaveera Pandian', state: 'chennai' }
    ];

    for (const player of playersToUpdate) {
        console.log(`\nProcessing player: ${player.name} (${player.mobile})`);

        // 1. Check if candidate exists
        let { data: candidate, error: fetchError } = await supabase
            .from('trial_candidates')
            .select('id')
            .eq('mobile', player.mobile)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error(`Error fetching candidate ${player.mobile}:`, fetchError);
            continue;
        }

        let candidateId;
        if (!candidate) {
            console.log(`Candidate ${player.mobile} not found. Creating...`);
            const { data: newCandidate, error: insertError } = await supabase
                .from('trial_candidates')
                .insert([{
                    name: player.name,
                    mobile: player.mobile,
                    state: player.state || null,
                    registration_id: crypto.randomUUID(), // Note: Node 19+ or crypto module
                    status: 'ACTIVE'
                }])
                .select()
                .single();

            if (insertError) {
                console.error(`Error creating candidate ${player.mobile}:`, insertError);
                continue;
            }
            candidateId = newCandidate.id;
            console.log(`Created candidate with ID: ${candidateId}`);
            
            // Wait a moment for trigger to initialize progress record
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            candidateId = candidate.id;
            console.log(`Found candidate with ID: ${candidateId}`);
        }

        // 2. Update progress record
        console.log(`Updating progress record for candidate ${candidateId}...`);
        const { data: progress, error: progressUpdateError } = await supabase
            .from('trial_progress')
            .update({
                l1_called: true,
                l1_attendance: 'ATTENDED',
                l1_result: 'SELECTED',
                l2_called: true,
                l2_attendance: 'ATTENDED',
                l2_result: 'SELECTED',
                l3_called: true,
                l3_attendance: 'ATTENDED',
                l3_result: 'SELECTED',
                current_level: 3,
                final_status: 'SELECTED',
                updated_at: new Date().toISOString()
            })
            .eq('candidate_id', candidateId)
            .select();

        if (progressUpdateError) {
            console.error(`Error updating progress for ${player.mobile}:`, progressUpdateError);
        } else {
            console.log(`Successfully updated progress for ${player.name}.`);
        }
    }

    console.log('\n--- Status Update Completed ---');
}

// polyfill randomUUID if not present (older node versions)
const crypto = require('crypto');
if (!crypto.randomUUID) {
    crypto.randomUUID = () => crypto.randomBytes(16).toString('hex'); // Simple fallback
}

updatePlayerStatuses().catch(err => {
    console.error('Fatal error in update script:', err);
});
