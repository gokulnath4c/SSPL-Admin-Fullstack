const express = require('express');
const router = express.Router();
const evolutionService = require('../services/evolutionService.cjs');
const callmebotService = require('../services/callmebotService.cjs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin (using service role key from process.env)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- SHARED GATEWAY & CAMPAIGN ENDPOINTS ---

// Get all gateways (CallMeBot)
router.get('/whatsapp/gateways', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_gateways')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Gateways Table Error (likely missing):', error.message);
            return res.json([]); 
        }
        res.json(data || []);
    } catch (error) {
        console.error('Gateways Catch Error:', error);
        res.json([]);
    }
});

// Add a gateway
router.post('/whatsapp/gateways', async (req, res) => {
    try {
        const { name, apikey, phone } = req.body;
        const { data, error } = await supabase
            .from('whatsapp_gateways')
            .insert({ name, apikey, phone })
            .select()
            .single();
            
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a gateway
router.delete('/whatsapp/gateways/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('whatsapp_gateways')
            .delete()
            .eq('id', req.params.id);
            
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all campaigns
router.get('/whatsapp/campaigns', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_campaigns')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create campaign
router.post('/whatsapp/campaigns', async (req, res) => {
    try {
        const { name, message_template, recipients, instance_name, use_buttons, buttons_config } = req.body;
        
        const { data: campaign, error: campaignError } = await supabase
            .from('whatsapp_campaigns')
            .insert({
                name,
                message_template,
                status: 'PENDING',
                instance_name,
                use_buttons,
                buttons_config
            })
            .select()
            .single();
            
        if (campaignError) throw campaignError;
        
        if (recipients && recipients.length > 0) {
            const recipientData = recipients.map(r => ({
                campaign_id: campaign.id,
                mobile: r.mobile,
                name: r.name,
                status: 'PENDING'
            }));
            
            const { error: recipientError } = await supabase
                .from('whatsapp_campaign_recipients')
                .insert(recipientData);
                
            if (recipientError) throw recipientError;
        }
        
        res.json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recipients for a campaign
router.get('/whatsapp/campaigns/:id/recipients', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_campaign_recipients')
            .select('*')
            .eq('campaign_id', req.params.id);
            
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all contacts/groups
router.get('/whatsapp/contacts', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_contacts')
            .select('*');
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- EVOLUTION INSTANCE ENDPOINTS ---
router.get('/whatsapp/instance', async (req, res) => {
    try {
        const instances = await evolutionService.fetchInstances();
        const detailedInstances = await Promise.all(instances.map(async (inst) => {
            try {
                const stateData = await evolutionService.getConnectionState(inst.instance.instanceName);
                return {
                    ...inst,
                    connectionStatus: stateData.instance?.state || 'UNKNOWN'
                };
            } catch (e) {
                return { ...inst, connectionStatus: 'ERROR' };
            }
        }));
        res.json(detailedInstances);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/whatsapp/instance', async (req, res) => {
    try {
        const { instanceName } = req.body;
        const name = instanceName || 'sspl_admin';
        try {
            const data = await evolutionService.createInstance(name);
            res.json(data);
        } catch (error) {
            if (error.response?.status === 400 || error.response?.status === 409 || error.response?.status === 403) {
                const state = await evolutionService.getConnectionState(name);
                return res.json(state);
            }
            throw error;
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/whatsapp/qr/:instanceName', async (req, res) => {
    try {
        const data = await evolutionService.getQrCode(req.params.instanceName);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/whatsapp/state/:instanceName', async (req, res) => {
    try {
        const data = await evolutionService.getConnectionState(req.params.instanceName);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/whatsapp/instance/:instanceName', async (req, res) => {
    try {
        const data = await evolutionService.logoutInstance(req.params.instanceName);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- BULK SEND ENGINE (Supports CallMeBot and Evolution) ---
router.post('/whatsapp/send-bulk', async (req, res) => {
    try {
        const { campaignId, instanceName, template, useButtons, safeMode, batchSize } = req.body;
        
        if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });

        res.json({ success: true, message: 'Bulk sending initiated' });

        (async () => {
            const logPrefix = `[Campaign ${campaignId}]`;
            console.log(`${logPrefix} Starting bulk send process...`);

            try {
                // 1. Fetch Campaign and Recipients
                const { data: campaign } = await supabase.from('whatsapp_campaigns').select('*').eq('id', campaignId).single();
                if (!campaign) return;

                const { data: recipients } = await supabase.from('whatsapp_campaign_recipients').select('*').eq('campaign_id', campaignId).eq('status', 'PENDING');
                if (!recipients) return;

                // 2. Determine Sender Type
                const isCallMeBot = instanceName.startsWith('callmebot_');
                let callmebotApiKey = null;
                
                if (isCallMeBot) {
                    const gatewayId = instanceName.replace('callmebot_', '');
                    const { data: gateway } = await supabase.from('whatsapp_gateways').select('apikey').eq('id', gatewayId).single();
                    callmebotApiKey = gateway?.apikey;
                }

                const limit = batchSize || recipients.length;
                const processingRecipients = recipients.slice(0, limit);
                
                let sentCount = 0;
                let failCount = 0;

                for (const recipient of processingRecipients) {
                    // Safety: Is campaign still active?
                    const { data: curCamp } = await supabase.from('whatsapp_campaigns').select('status').eq('id', campaignId).single();
                    if (curCamp?.status !== 'IN_PROGRESS') break;

                    const message = campaign.message_template.replace(/{name}/g, recipient.name || 'there');
                    
                    try {
                        if (isCallMeBot) {
                            if (!callmebotApiKey) throw new Error('API Key missing');
                            await callmebotService.sendMessage(recipient.mobile, message, callmebotApiKey);
                        } else {
                            if (useButtons && (campaign.buttons_config || []).length > 0) {
                                await evolutionService.sendButtonMessage(instanceName, recipient.mobile, message, campaign.buttons_config);
                            } else {
                                await evolutionService.sendMessage(instanceName, recipient.mobile, message);
                            }
                        }
                        
                        await supabase.from('whatsapp_campaign_recipients').update({ status: 'SENT', sent_at: new Date().toISOString() }).eq('id', recipient.id);
                        await supabase.rpc('increment_campaign_counters', { camp_id: campaignId, inc_today: 1, inc_total: 1 });
                        sentCount++;
                    } catch (err) {
                        await supabase.from('whatsapp_campaign_recipients').update({ status: 'FAILED', error_message: err.message }).eq('id', recipient.id);
                        failCount++;
                    }

                    // Progress Log
                    if (sentCount % 5 === 0) {
                         await supabase.from('whatsapp_worker_logs').insert({ campaign_id: campaignId, message: `Progress: ${sentCount} sent, ${failCount} failed.` });
                    }

                    // Delay
                    const delay = isCallMeBot ? 3000 : (safeMode ? (Math.random() * 120000 + 60000) : (Math.random() * 2000 + 1000));
                    await new Promise(r => setTimeout(r, delay));
                }

                await supabase.from('whatsapp_campaigns').update({ status: 'COMPLETED' }).eq('id', campaignId);

            } catch (error) {
                console.error(`${logPrefix} Background Error:`, error);
            }
        })();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Group and Filter routes
router.get('/whatsapp/groups/:instanceName', async (req, res) => {
    try {
        const data = await evolutionService.fetchGroups(req.params.instanceName);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/whatsapp/filter-leads', async (req, res) => {
    try {
        const { instanceName, prefix, startNum, count } = req.body;
        const generatedNumbers = Array.from({ length: count }, (_, i) => prefix + (startNum + i).toString().padStart(3, '0'));
        const validNumbers = [];
        const batchSize = 20;
        
        for (let i = 0; i < generatedNumbers.length; i += batchSize) {
            const batch = generatedNumbers.slice(i, i + batchSize);
            const results = await evolutionService.checkWhatsApp(instanceName, batch);
            if (Array.isArray(results)) {
                results.forEach(r => { if (r.exists) validNumbers.push({ mobile: r.jid.split('@')[0], name: `Lead ${r.jid.split('@')[0]}` }); });
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        res.json({ totalGenerated: generatedNumbers.length, validCount: validNumbers.length, validNumbers: validNumbers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/whatsapp/workers/logs', async (req, res) => {
    try {
        const { data } = await supabase.from('whatsapp_worker_logs').select('*').order('created_at', { ascending: false }).limit(50);
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message, logs: [] });
    }
});

// Manual Registration (Kept for local SIM users)
router.post('/whatsapp/manual-request-code', async (req, res) => {
    try {
        const { instanceName, phoneNumber } = req.body;
        try { await evolutionService.createInstance(instanceName); } catch (e) {}
        const data = await evolutionService.requestRegistrationCode(instanceName, phoneNumber);
        res.json({ success: true, ...data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/whatsapp/manual-register', async (req, res) => {
    try {
        const { instanceName, code } = req.body;
        const data = await evolutionService.registerNumber(instanceName, code);
        res.json({ success: true, ...data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
