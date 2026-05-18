const supabase = require('./config/supabase.cjs');

async function checkTable() {
    try {
        const { data, error } = await supabase
            .from('chat_logs')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error querying chat_logs:', error);
        } else {
            if (data && data.length > 0) {
                console.log('Columns:', Object.keys(data[0]));
            } else {
                console.log('Table exists but is empty.');
            }
        }
    } catch (err) {
        console.error('Exception:', err);
    }
}

checkTable();
