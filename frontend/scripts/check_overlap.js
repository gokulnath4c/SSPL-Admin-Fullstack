
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkOverlap() {
    console.log("Checking for players in both 'trials_section' and 'trials_allocated'...");

    // Fetch all players in trials_section
    const { data: sectionPlayers, error: err1 } = await supabase
        .from('player_workflow')
        .select('registration_id, email, phone, full_name')
        .eq('workflow_stage', 'trials_section');

    // Fetch all players in trials_allocated
    const { data: allocatedPlayers, error: err2 } = await supabase
        .from('player_workflow')
        .select('registration_id, email, phone, full_name')
        .eq('workflow_stage', 'trials_allocated');

    if (err1 || err2) { console.error(err1 || err2); return; }

    const allocatedRegIds = new Set(allocatedPlayers.map(p => p.registration_id));
    const overlap = sectionPlayers.filter(p => allocatedRegIds.has(p.registration_id));

    console.log(`Trials Section Count: ${sectionPlayers.length}`);
    console.log(`Trials Allocated Count: ${allocatedPlayers.length}`);
    console.log(`Overlap (Players in BOTH): ${overlap.length}`);

    if (overlap.length > 0) {
        console.log("Example Overlaps:");
        overlap.slice(0, 5).forEach(p => console.log(` - ${p.full_name} (${p.email})`));

        // Suggestion for cleanup: Logic to delete the 'trials_section' entry if 'trials_allocated' exists?
        // Or update it?
    }
}

checkOverlap();
