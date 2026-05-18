const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fazpykekypcktcmniwbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenB5a2VreXBja3RjbW5pd2JqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgyNDIzNywiZXhwIjoyMDcxNDAwMjM3fQ.b9ydyxCtsJBV90DyMnHOcyVEsfJoUSIdqTGJak3ItZU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncFinalStatus() {
    console.log('Synchronizing final_status for all candidates...');

    // 1. Mark as SELECTED if L3 result is SELECTED
    const { count: selectedCount, error: sErr } = await supabase
        .from('trial_progress')
        .update({ final_status: 'SELECTED' })
        .eq('l3_result', 'SELECTED');
    
    if (sErr) console.error('Error updating SELECTED:', sErr);
    else console.log(`Marked ${selectedCount} as SELECTED (Final).`);

    // 2. Mark as REJECTED if any level is REJECTED
    const { count: r1Count } = await supabase
        .from('trial_progress')
        .update({ final_status: 'REJECTED' })
        .eq('l1_result', 'REJECTED');
    
    const { count: r2Count } = await supabase
        .from('trial_progress')
        .update({ final_status: 'REJECTED' })
        .eq('l2_result', 'REJECTED');
        
    const { count: r3Count } = await supabase
        .from('trial_progress')
        .update({ final_status: 'REJECTED' })
        .eq('l3_result', 'REJECTED');

    console.log(`Marked as REJECTED: L1=${r1Count || 0}, L2=${r2Count || 0}, L3=${r3Count || 0}`);

    console.log('Sync Complete!');
}

syncFinalStatus();
