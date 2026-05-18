const { createClient } = require('@supabase/supabase-js');
const evolutionService = require('../services/evolutionService.cjs');
require('dotenv').config({ path: '.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const campaignId = 'f18c6073-6650-4d1c-b2b1-9263e258625c';
const instanceName = 'sspl_admin';

async function resumeCampaign() {
    const logPrefix = `[Resume Campaign ${campaignId}]`;
    console.log(`${logPrefix} Starting manual resume process...`);

    try {
        // 1. Fetch Campaign
        const { data: campaign, error: cError } = await supabase
            .from('whatsapp_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (cError || !campaign) {
            console.error(`${logPrefix} Error fetching campaign:`, cError);
            return;
        }

        console.log(`${logPrefix} Campaign found: ${campaign.name}. Status: ${campaign.status}`);

        // Ensure status is IN_PROGRESS (if it was paused, we should change it to IN_PROGRESS to allow the loop to run)
        if (campaign.status !== 'IN_PROGRESS') {
            console.log(`${logPrefix} Updating status to IN_PROGRESS...`);
            await supabase.from('whatsapp_campaigns').update({ status: 'IN_PROGRESS' }).eq('id', campaignId);
        }

        // 2. Fetch Recipients
        const { data: recipients, errorAddress } = await supabase
            .from('whatsapp_campaign_recipients')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('status', 'PENDING');

        if (errorAddress || !recipients) {
            console.error(`${logPrefix} Error fetching recipients:`, errorAddress);
            return;
        }

        console.log(`${logPrefix} Found ${recipients.length} pending recipients.`);

        if (recipients.length === 0) {
            console.log(`${logPrefix} No pending recipients. Completing campaign.`);
            await supabase.from('whatsapp_campaigns').update({ status: 'COMPLETED', completed_at: new Date().toISOString() }).eq('id', campaignId);
            return;
        }

        let sentCount = 0;
        let failCount = 0;
        let stopped = false;

        const safeMode = campaign.safe_mode !== false; // Default to true if not specified
        const buttons = campaign.buttons_config || [];

        await supabase.from('whatsapp_worker_logs').insert({
            campaign_id: campaignId,
            level: 'INFO',
            message: `[${instanceName}] Worker MANUALLY RESUMED. Processing ${recipients.length} recipients. (Safe Mode: ${safeMode})`
        });

        for (const recipient of recipients) {
            if (stopped) break;

            // Health check: Is campaign still IN_PROGRESS?
            const { data: currentCampaign } = await supabase
                .from('whatsapp_campaigns')
                .select('status')
                .eq('id', campaignId)
                .single();
            
            if (currentCampaign?.status !== 'IN_PROGRESS') {
                console.log(`${logPrefix} Campaign status changed to ${currentCampaign?.status}. Stopping.`);
                stopped = true;
                break;
            }

            // Instance check
            const state = await evolutionService.getConnectionState(instanceName);
            if (state?.instance?.state !== 'open') {
                console.error(`${logPrefix} Instance ${instanceName} is not open. Stopping.`);
                stopped = true;
                break;
            }

            const message = campaign.message_template.replace(/{name}/g, recipient.name || 'there');
            
            try {
                if (campaign.use_buttons && buttons.length > 0) {
                    await evolutionService.sendButtonMessage(instanceName, recipient.mobile, message, buttons);
                } else {
                    await evolutionService.sendMessage(instanceName, recipient.mobile, message);
                }
                
                await supabase
                    .from('whatsapp_campaign_recipients')
                    .update({ status: 'SENT', sent_at: new Date().toISOString() })
                    .eq('id', recipient.id);
                
                await supabase.rpc('increment_campaign_counters', { 
                    camp_id: campaignId, 
                    inc_today: 1, 
                    inc_total: 1 
                });

                sentCount++;
                console.log(`${logPrefix} Sent to ${recipient.mobile} (${sentCount}/${recipients.length})`);

            } catch (err) {
                const errorMsg = err.response?.data?.message || err.message;
                console.error(`${logPrefix} Failed to send to ${recipient.mobile}:`, errorMsg);
                await supabase
                    .from('whatsapp_campaign_recipients')
                    .update({ status: 'FAILED', error_message: errorMsg })
                    .eq('id', recipient.id);
                
                await supabase.from('whatsapp_worker_logs').insert({
                    campaign_id: campaignId,
                    level: 'ERROR',
                    message: `[${instanceName}] Failed ${recipient.mobile}: ${errorMsg}`
                });

                failCount++;
            }

            // Batch Logging
            if (sentCount % 10 === 0) {
                 await supabase.from('whatsapp_worker_logs').insert({
                    campaign_id: campaignId,
                    level: 'INFO',
                    message: `[${instanceName}] Progress: ${sentCount} sent, ${failCount} failed this session.`
                });
            }

            // Delay
            if (sentCount < recipients.length && !stopped) {
                const delayMs = safeMode 
                    ? (60000 + Math.random() * 120000) // 1-3 minutes
                    : (3000 + Math.random() * 3000);   // 3-6 seconds (slightly increased for safety)
                
                console.log(`${logPrefix} Waiting ${Math.round(delayMs/1000)}s...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        if (!stopped) {
            await supabase.from('whatsapp_campaigns').update({ 
                status: 'COMPLETED',
                completed_at: new Date().toISOString()
            }).eq('id', campaignId);
            
            await supabase.from('whatsapp_worker_logs').insert({
                campaign_id: campaignId,
                level: 'INFO',
                message: `[${instanceName}] Campaign completed. Session Sent: ${sentCount}, Session Failed: ${failCount}`
            });
        }

    } catch (bgError) {
        console.error(`${logPrefix} Critical Error:`, bgError);
        await supabase.from('whatsapp_worker_logs').insert({
            campaign_id: campaignId,
            level: 'ERROR',
            message: `[${instanceName}] Critical Worker Error: ${bgError.message}`
        });
    }
}

resumeCampaign();
