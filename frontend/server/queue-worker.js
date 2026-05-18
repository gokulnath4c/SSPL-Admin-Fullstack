import { createClient } from '@supabase/supabase-js';
import { evolutionClient } from './evolution-client.js';
import { throttleEngine } from './throttle-engine.js';
import dotenv from 'dotenv';

dotenv.config();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

class QueueWorker {
    constructor(instanceName) {
        this.instanceName = instanceName;
        this.isRunning = false;
        this.activeCampaignId = null;
        this.batchCount = 0;
        this.sessionCount = 0;
    }

    async log(level, message, campaignId = null) {
        try {
            const entry = {
                level,
                message: `[${this.instanceName}] ${message}`,
                campaign_id: campaignId,
                created_at: new Date().toISOString()
            };
            
            // Add to memory buffer in Manager
            workerManager.addLog(entry);

            console.log(`[${this.instanceName}][${level}] ${message}`);
            await supabase.from('whatsapp_worker_logs').insert(entry);
        } catch (err) {
            console.error(`[Worker Log Error] ${err.message}`);
        }
    }

    async start(campaignId) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.activeCampaignId = campaignId;
        this.batchCount = 0;
        
        await this.log('INFO', `Worker started for campaign: ${campaignId}`, campaignId);
        
        // Link campaign to this instance
        await supabase.from('whatsapp_campaigns').update({ 
            status: 'IN_PROGRESS',
            instance_name: this.instanceName,
            started_at: new Date().toISOString()
        }).eq('id', campaignId);
        
        this.process();
    }

    async stop() {
        this.isRunning = false;
        if (this.activeCampaignId) {
            await this.log('INFO', 'Worker paused', this.activeCampaignId);
            await supabase.from('whatsapp_campaigns').update({ 
                status: 'PAUSED',
                paused_at: new Date().toISOString()
            }).eq('id', this.activeCampaignId);
        }
    }

    async process() {
        while (this.isRunning) {
            try {
                // 1. Check Business Hours
                if (!throttleEngine.isWithinBusinessHours()) {
                    await this.log('WARN', 'Outside business hours. Sleeping 30m.', this.activeCampaignId);
                    await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000));
                    continue;
                }

                // 2. Load Campaign Settings
                const { data: campaign, error: cError } = await supabase
                    .from('whatsapp_campaigns')
                    .select('*')
                    .eq('id', this.activeCampaignId)
                    .single();

                if (cError || !campaign) {
                    await this.log('ERROR', 'Failed to load campaign settings', this.activeCampaignId);
                    this.isRunning = false;
                    break;
                }

                // 2b. Daily Reset Logic
                const now = new Date();
                const istOffset = 5.5 * 60 * 60 * 1000;
                const istNow = new Date(now.getTime() + istOffset);
                const todayStr = istNow.toISOString().split('T')[0];

                if (campaign.last_sent_at) {
                    const lastSent = new Date(new Date(campaign.last_sent_at).getTime() + istOffset);
                    const lastSentDay = lastSent.toISOString().split('T')[0];
                    if (todayStr !== lastSentDay) {
                        await supabase.from('whatsapp_campaigns').update({ messages_sent_today: 0 }).eq('id', this.activeCampaignId);
                        campaign.messages_sent_today = 0;
                    }
                }

                // 3. Check Daily Limit
                if (campaign.messages_sent_today >= campaign.daily_limit) {
                    await this.log('INFO', `Daily limit reached.`, this.activeCampaignId);
                    this.isRunning = false;
                    await supabase.from('whatsapp_campaigns').update({ status: 'READY' }).eq('id', this.activeCampaignId);
                    break;
                }

                // 4. Load Next Pending
                const { data: recipients, error: rError } = await supabase
                    .from('whatsapp_campaign_recipients')
                    .select('*')
                    .eq('campaign_id', this.activeCampaignId)
                    .eq('status', 'PENDING')
                    .limit(campaign.batch_size)
                    .order('created_at', { ascending: true });

                if (rError || !recipients || recipients.length === 0) {
                    await this.log('SUCCESS', 'Campaign completed!', this.activeCampaignId);
                    await supabase.from('whatsapp_campaigns').update({ 
                        status: 'COMPLETED',
                        completed_at: new Date().toISOString()
                    }).eq('id', this.activeCampaignId);
                    this.isRunning = false;
                    break;
                }

                // 5. Process Batch
                for (const recipient of recipients) {
                    if (!this.isRunning) break;

                    try {
                        const message = throttleEngine.varyMessage(campaign.message_template, {
                            name: recipient.name,
                            mobile: recipient.mobile
                        });

                        let phone = recipient.mobile.replace(/\D/g, '');
                        if (phone.length === 10) phone = '91' + phone;

                        if (campaign.use_buttons) {
                            await evolutionClient.sendButtons(this.instanceName, phone, 'SSPL Cricket Trials', message, '– Team SSPL', [
                                { type: 'url', text: '🏆 Register Now', url: 'https://ssplt10.co.in/trial-results' },
                                { type: 'url', text: '📸 Instagram', url: 'https://instagram.com/ssplt10' },
                                { type: 'url', text: '📺 YouTube', url: 'https://www.youtube.com/@Southernstreetpremierleague' }
                            ]);
                        } else {
                            await evolutionClient.sendText(this.instanceName, phone, message);
                        }

                        await supabase.from('whatsapp_campaign_recipients').update({
                            status: 'SENT',
                            sent_at: new Date().toISOString()
                        }).eq('id', recipient.id);

                        await supabase.rpc('increment_campaign_counters', { 
                            camp_id: this.activeCampaignId,
                            inc_today: 1,
                            inc_total: 1
                        });

                        this.batchCount++;
                        this.sessionCount++;

                        const delay = throttleEngine.getDelay(campaign.min_delay_seconds, campaign.max_delay_seconds);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } catch (err) {
                        const errorDetail = err.data ? JSON.stringify(err.data) : err.message;
                        await this.log('ERROR', `Failed ${recipient.mobile}: ${errorDetail}`, this.activeCampaignId);
                        await supabase.from('whatsapp_campaign_recipients').update({
                            status: 'FAILED',
                            error_message: err.message
                        }).eq('id', recipient.id);
                    }
                }

                // 6. Breaks
                if (this.isRunning) {
                    const breakTime = this.sessionCount >= 300 ? throttleEngine.getSessionBreak() : throttleEngine.getBatchPause();
                    if (this.sessionCount >= 300) this.sessionCount = 0;
                    await this.log('INFO', `Taking break (${Math.round(breakTime/60000)} min)...`, this.activeCampaignId);
                    await new Promise(resolve => setTimeout(resolve, breakTime));
                }

            } catch (err) {
                await this.log('ERROR', `Critical error: ${err.message}`, this.activeCampaignId);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
}

class WorkerManager {
    constructor() {
        this.workers = new Map(); // instanceName -> QueueWorker
        this.logs = []; // Memory buffer for latest logs
    }

    addLog(entry) {
        this.logs.unshift(entry);
        if (this.logs.length > 100) this.logs.pop(); // Keep last 100
    }

    getLogs() {
        return this.logs;
    }

    getWorker(instanceName) {
        if (!this.workers.has(instanceName)) {
            this.workers.set(instanceName, new QueueWorker(instanceName));
        }
        return this.workers.get(instanceName);
    }

    async startCampaign(instanceName, campaignId) {
        const worker = this.getWorker(instanceName);
        if (worker.isRunning) {
            throw new Error(`Instance ${instanceName} is already running campaign ${worker.activeCampaignId}`);
        }
        await worker.start(campaignId);
    }

    async stopCampaign(instanceName) {
        if (this.workers.has(instanceName)) {
            await this.workers.get(instanceName).stop();
        }
    }

    async stopByCampaignId(campaignId) {
        for (const worker of this.workers.values()) {
            if (worker.activeCampaignId === campaignId) {
                await worker.stop();
            }
        }
    }

    getStatus() {
        const status = [];
        for (const [instance, worker] of this.workers.entries()) {
            if (worker.isRunning) {
                status.push({
                    instance,
                    campaignId: worker.activeCampaignId,
                    isRunning: worker.isRunning
                });
            }
        }
        return status;
    }
}

export const workerManager = new WorkerManager();
