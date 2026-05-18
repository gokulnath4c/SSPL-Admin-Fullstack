const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCampaigns() {
  console.log('--- Campaign Status ---');
  const { data: campaigns, error: cError } = await supabase
    .from('whatsapp_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (cError) {
    console.error('Error fetching campaigns:', cError);
    return;
  }

  campaigns.forEach(c => {
    console.log(`ID: ${c.id} | Name: ${c.name} | Status: ${c.status} | Total: ${c.total_recipients} | Sent: ${c.sent_today}`);
  });

  console.log('\n--- Recent Worker Logs ---');
  const { data: logs, error: lError } = await supabase
    .from('whatsapp_worker_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (lError) {
    console.error('Error fetching logs:', lError);
    return;
  }

  logs.forEach(l => {
    console.log(`[${l.created_at}] [Campaign ${l.campaign_id}] ${l.message}`);
  });

  console.log('\n--- Pending Recipient Counts ---');
  const { data: counts, error: countError } = await supabase
    .from('whatsapp_campaign_recipients')
    .select('campaign_id, status')
    .in('status', ['PENDING', 'FAILED']);

  if (countError) {
    console.error('Error fetching recipient counts:', countError);
    return;
  }

  const summary = counts.reduce((acc, curr) => {
    const key = `${curr.campaign_id}-${curr.status}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log(summary);
}

checkCampaigns();
