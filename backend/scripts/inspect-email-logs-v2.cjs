require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function inspect() {
    console.log('🔍 Inspecting email_logs schema...');

    // Fetch one record to see keys
    const { data, error } = await supabase.from('email_logs').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Keys found:', Object.keys(data[0]));
        console.log('Sample Record:', data[0]);
    } else {
        console.log('Table exists but is empty. Cannot determine columns from data.');
        // Try inserting a dummy column to see if it works or fails?
        // No, let's just assume we might need to add columns.
    }
}

inspect();
