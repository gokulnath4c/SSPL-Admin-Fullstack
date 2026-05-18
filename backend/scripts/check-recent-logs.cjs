require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function checkRecentLogs() {
    console.log('🔍 Checking recent email logs...');

    const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    if (data) {
        data.forEach(log => {
            console.log(`[${new Date(log.sent_at).toLocaleTimeString()}] ${log.email} (${log.email_type}): ${log.status}`);
        });
    }
}

checkRecentLogs();
