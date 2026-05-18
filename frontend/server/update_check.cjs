
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/ssplt10.cloud-prod-sync-20251006/httpdocs/admin/react-app/server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function countPending() {
  const { count, error } = await supabase
    .from('player_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('payment_status', 'pending');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total pending registrations:', count);
  }

  const { data: recent, error: err2 } = await supabase
    .from('player_registrations')
    .select('id, full_name, phone, created_at, razorpay_order_id, razorpay_payment_id')
    .eq('payment_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (err2) {
    console.error('Error fetching recent:', err2);
  } else {
    console.log('Recent 10 pending:', recent);
  }
}

countPending();
