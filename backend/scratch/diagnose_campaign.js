const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const campaignId = 'f18c6073-6650-4d1c-b2b1-9263e258625c';

async function diagnoseCampaign() {
    console.log(`Diagnosing Campaign: ${campaignId}`);
    
    const { data: campaign, error: cError } = await supabase
        .from('whatsapp_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
    
    if (cError) {
        console.error('Error fetching campaign:', cError);
        return;
    }
    
    console.log('Campaign Details:');
    console.log(`- Status: ${campaign.status}`);
    console.log(`- Total Recipients: ${campaign.total_recipients}`);
    console.log(`- Sent Today: ${campaign.sent_today}`);
    console.log(`- Safe Mode: ${campaign.safe_mode}`);
    console.log(`- Template: ${campaign.message_template}`);

    const { data: stats, error: sError } = await supabase
        .from('whatsapp_campaign_recipients')
        .select('status', { count: 'exact' });
    
    // Note: the above query might be missing filter for campaign_id, let me fix that
    const { data: recipients, error: rError } = await supabase
        .from('whatsapp_campaign_recipients')
        .select('status')
        .eq('campaign_id', campaignId);
    
    if (rError) {
        console.error('Error fetching recipients:', rError);
        return;
    }

    const counts = recipients.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {});

    console.log('Recipient Stats:');
    console.log(counts);

    const { data: failedLogs, error: fError } = await supabase
        .from('whatsapp_campaign_recipients')
        .select('mobile, error_message')
        .eq('campaign_id', campaignId)
        .eq('status', 'FAILED')
        .limit(5);

    if (failedLogs && failedLogs.length > 0) {
        console.log('Recent Failures:');
        failedLogs.forEach(f => console.log(`- ${f.mobile}: ${f.error_message}`));
    }
}

diagnoseCampaign();
