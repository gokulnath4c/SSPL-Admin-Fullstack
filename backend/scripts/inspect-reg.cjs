require('dotenv').config({ path: __dirname + '/../.env.production' });
const supabase = require('../config/supabase.cjs');

async function inspect() {
    const { data, error } = await supabase
        .from('player_registrations')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        const keys = Object.keys(data[0]);
        console.log('Payment/Status Keys:', keys.filter(k => k.includes('status') || k.includes('payment') || k.includes('paid')));
    }
}

inspect();
