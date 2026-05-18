require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function inspect() {
    const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        const keys = Object.keys(data[0] || {});
        console.log('Email Logs Keys:', keys);
    }
}

inspect();
