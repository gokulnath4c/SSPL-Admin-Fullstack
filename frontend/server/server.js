import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { evolutionClient } from './evolution-client.js';
import { workerManager } from './queue-worker.js';
import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

// Helper: Derive true payment status
const getDerivedStatus = (tx) => {
    if (tx.payment_error_details) return 'failed';
    if (tx.payment_status === 'captured') {
        const hasId = !!tx.razorpay_payment_id;
        const hasAmount = (tx.amount_paid || 0) > 0;
        if (!hasId || !hasAmount) return 'pending';
        return 'captured';
    }
    return tx.payment_status || 'pending';
};

// Helper: Check if error is due to Evolution API being offline
const isOfflineError = (err) => {
    return err.code === 'ECONNREFUSED' || 
           err.status === 503 || 
           err.message?.includes('unreachable') || 
           err.message?.includes('fetch failed') ||
           err.message?.includes('OFFLINE');
};

app.get('/api/whatsapp/instance', async (req, res) => {
    try {
        const result = await evolutionClient.fetchInstances();
        res.json(result);
    } catch (err) {
        if (isOfflineError(err)) {
            console.warn('[Server] Evolution API is offline');
            return res.json([]);
        }
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/whatsapp/instance', async (req, res) => {
    try {
        const { instanceName } = req.body;
        const result = await evolutionClient.createInstance(instanceName);
        res.json(result);
    } catch (err) {
        if (isOfflineError(err)) {
            return res.status(200).json({ 
                offline: true, 
                message: 'Evolution API is offline. Please start Docker Desktop.' 
            });
        }
        console.error(`[Server] Error creating instance:`, err);
        res.status(err.status || 500).json({ 
            error: err.message,
            details: err.data || null
        });
    }
});

app.get('/api/whatsapp/state/:name', async (req, res) => {
    try {
        const result = await evolutionClient.getInstanceStatus(req.params.name);
        res.json(result);
    } catch (err) {
        // Fallback for missing instances or offline API
        if (isOfflineError(err) || err.message.includes('404')) {
            return res.status(200).json({ 
                instance: { 
                    instanceName: req.params.name,
                    state: 'OFFLINE' 
                } 
            });
        }
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/whatsapp/qr/:name', async (req, res) => {
    try {
        const result = await evolutionClient.getQR(req.params.name);
        res.json(result);
    } catch (err) {
        if (isOfflineError(err)) {
            console.warn('[Server] Evolution API is offline. QR fetch failed.');
            return res.json({ base64: null, message: 'Evolution API is offline' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/whatsapp/instance/:name', async (req, res) => {
    try {
        const result = await evolutionClient.deleteInstance(req.params.name);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Group Routes ---

app.get('/api/whatsapp/groups/:name', async (req, res) => {
    try {
        const result = await evolutionClient.getGroups(req.params.name);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/whatsapp/groups/participants', async (req, res) => {
    try {
        const { instanceName, groupJid, participants, smartJoin } = req.body;
        const result = await evolutionClient.addParticipants(instanceName, groupJid, participants, smartJoin);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/whatsapp/create-group', async (req, res) => {
    try {
        const { instanceName, subject, participants } = req.body;
        const result = await evolutionClient.createGroup(instanceName, subject, participants);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Bulk Campaign Routes ---

app.post('/api/whatsapp/send-bulk', async (req, res) => {
    try {
        const { campaignId, instanceName } = req.body;
        if (!campaignId) return res.status(400).json({ error: 'Campaign ID required' });
        if (!instanceName) return res.status(400).json({ error: 'Instance Name required' });
        
        await workerManager.startCampaign(instanceName, campaignId);
        res.json({ success: true, message: `Campaign queued for instance ${instanceName}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/whatsapp/campaign/:id/pause', async (req, res) => {
    try {
        const { id } = req.params;
        await workerManager.stopByCampaignId(id);
        res.json({ success: true, message: 'Campaign worker paused' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/whatsapp/workers/status', (req, res) => {
    res.json(workerManager.getStatus());
});

app.get('/api/whatsapp/workers/logs', (req, res) => {
    res.json(workerManager.getLogs());
});

// --- Campaign Management Routes (Bypassing RLS) ---

app.get('/api/whatsapp/campaigns', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_campaigns')
            .select(`
                *,
                whatsapp_campaign_recipients(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map((c) => ({
            ...c,
            recipient_count: c.whatsapp_campaign_recipients?.[0]?.count || 0
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/whatsapp/campaign/:id/recipients', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('whatsapp_campaign_recipients')
            .select('*')
            .eq('campaign_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/whatsapp/campaign/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { error } = await supabase
            .from('whatsapp_campaigns')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
        
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/whatsapp/campaigns', async (req, res) => {
    try {
        const { name, message_template, recipients, use_buttons } = req.body;
        
        // 1. Create Campaign
        const { data: campaign, error: cError } = await supabase
            .from('whatsapp_campaigns')
            .insert([{
                name,
                message_template,
                status: 'DRAFT',
                use_buttons: !!use_buttons
            }])
            .select()
            .single();

        if (cError) throw cError;

        // 2. Add Recipients if any
        if (recipients && recipients.length > 0) {
            const formattedRecipients = recipients.map(r => ({
                campaign_id: campaign.id,
                name: r.name,
                mobile: r.mobile
            }));
            
            const { error: rError } = await supabase
                .from('whatsapp_campaign_recipients')
                .insert(formattedRecipients);
            
            if (rError) throw rError;
        }

        res.json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeWorkers: workerManager.getStatus() });
});

// --- Razorpay Admin Routes ---

app.get('/api/admin/razorpay/transactions', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status, from, to } = req.query;
        const fromIdx = (parseInt(page) - 1) * parseInt(limit);
        const toIdx = fromIdx + parseInt(limit) - 1;

        let query = supabase
            .from('player_registrations')
            .select('*', { count: 'exact' });

        if (status) query = query.eq('payment_status', status);
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to);
        if (search) {
            query = query.or(`email.ilike.%${search}%,razorpay_payment_id.ilike.%${search}%`);
        }

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range(fromIdx, toIdx);

        if (error) throw error;

        const mappedData = (data || []).map(tx => ({
            id: tx.id,
            payment_id: tx.razorpay_payment_id,
            order_id: tx.razorpay_order_id || '-',
            amount: tx.payment_amount,
            status: getDerivedStatus(tx),
            contact: tx.phone,
            email: tx.email,
            method: tx.payment_method || '-',
            created_at: tx.created_at,
            razorpay_dashboard_url: tx.razorpay_payment_id ? `https://dashboard.razorpay.com/app/payments/${tx.razorpay_payment_id}` : '#'
        }));

        res.status(200).json({
            data: mappedData,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error(`[Admin Razorpay] ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/razorpay/stats', async (req, res) => {
    try {
        const { search, status, from, to } = req.query;
        let allRecords = [];
        let pageIdx = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        while (hasMore) {
            let query = supabase
                .from('player_registrations')
                .select('payment_status, payment_amount, amount_paid, razorpay_payment_id, payment_error_details, created_at, email');

            if (status) query = query.eq('payment_status', status);
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to);
            if (search) {
                query = query.or(`email.ilike.%${search}%,razorpay_payment_id.ilike.%${search}%`);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .range(pageIdx * PAGE_SIZE, (pageIdx + 1) * PAGE_SIZE - 1);

            if (error) throw error;
            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allRecords = allRecords.concat(data);
                if (data.length < PAGE_SIZE) hasMore = false;
                else pageIdx++;
            }
            if (pageIdx > 20) hasMore = false;
        }

        const processedRecords = allRecords.map(tx => ({
            ...tx,
            derivedStatus: getDerivedStatus(tx)
        }));

        const stats = {
            total_count: processedRecords.length,
            total_volume: processedRecords.reduce((sum, tx) => sum + (tx.payment_amount || 0), 0),
            success_count: processedRecords.filter(tx => tx.derivedStatus === 'captured').length,
            success_volume: processedRecords.filter(tx => tx.derivedStatus === 'captured').reduce((sum, tx) => sum + (tx.amount_paid || 0), 0),
            failed_count: processedRecords.filter(tx => tx.derivedStatus === 'failed').length
        };

        res.status(200).json(stats);
    } catch (error) {
        console.error(`[Admin Stats Error] ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/razorpay/reconcile', async (req, res) => {
    try {
        const { limit = 100, mode = 'unverified', phone } = req.query;
        let records = [];
        let fetchError = null;

        if (phone) {
            const result = await supabase.from('player_registrations').select('*').eq('phone', phone);
            records = result.data;
            fetchError = result.error;
        } else if (mode === 'unverified') {
            const result = await supabase.from('player_registrations').select('*').eq('payment_status', 'captured').is('razorpay_payment_id', null).limit(parseInt(limit));
            records = result.data;
            fetchError = result.error;
        } else if (mode === 'pending') {
            const result = await supabase.from('player_registrations').select('*').eq('payment_status', 'pending').limit(parseInt(limit));
            records = result.data;
            fetchError = result.error;
        }

        if (fetchError) throw fetchError;
        if (!records || records.length === 0) return res.status(200).json({ message: 'No records found', processed: 0 });

        let corrected = 0;
        let reverted = 0;
        let duplicateCount = 0;
        let errors = 0;

        let recentPayments = [];
        try {
            const pResponse = await razorpay.payments.all({ count: 100 });
            recentPayments = pResponse.items.filter(p => p.status === 'captured');
        } catch (e) {
            console.warn('[Admin Razorpay] Razorpay fetch failed');
        }

        for (const record of records) {
            try {
                let foundPayment = null;
                if (record.razorpay_order_id) {
                    try {
                        const payments = await razorpay.orders.fetchPayments(record.razorpay_order_id);
                        foundPayment = payments.items.find(p => p.status === 'captured');
                    } catch (e) {}
                }
                if (!foundPayment) {
                    foundPayment = recentPayments.find(p => p.contact === record.phone || p.contact === `+91${record.phone}` || p.email === record.email);
                }

                if (foundPayment) {
                    const { data: existing } = await supabase.from('player_registrations').select('id').eq('razorpay_payment_id', foundPayment.id).neq('id', record.id);
                    if (existing && existing.length > 0) {
                        await supabase.from('player_registrations').update({ payment_status: 'duplicate', status: 'cancelled' }).eq('id', record.id);
                        duplicateCount++;
                        continue;
                    }
                    const { error: updateErr } = await supabase.from('player_registrations').update({
                        payment_status: 'captured',
                        status: 'paid',
                        razorpay_payment_id: foundPayment.id,
                        razorpay_order_id: foundPayment.order_id,
                        amount_paid: foundPayment.amount / 100,
                        updated_at: new Date().toISOString()
                    }).eq('id', record.id);
                    if (!updateErr) corrected++;
                    else errors++;
                } else if (mode === 'unverified') {
                    await supabase.from('player_registrations').update({ payment_status: 'pending', status: 'pending' }).eq('id', record.id);
                    reverted++;
                }
            } catch (pErr) { errors++; }
        }
        res.status(200).json({ message: `Batch complete. Corrected: ${corrected}, Reverted: ${reverted}, Duplicates: ${duplicateCount}, Errors: ${errors}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/razorpay/export', async (req, res) => {
    try {
        const { search, status, from, to } = req.query;
        let query = supabase.from('player_registrations').select('full_name, email, phone, city, state, payment_amount, amount_paid, payment_status, razorpay_payment_id, created_at');
        
        if (status) query = query.eq('payment_status', status);
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to);
        if (search) query = query.or(`email.ilike.%${search}%,razorpay_payment_id.ilike.%${search}%`);

        const { data, error } = await query.order('created_at', { ascending: false }).limit(2000);
        if (error) throw error;

        const csvRows = [
            ['Name', 'Email', 'Phone', 'City', 'State', 'Amount', 'Paid', 'Status', 'Payment ID', 'Date'].join(',')
        ];

        (data || []).forEach(row => {
            csvRows.push([
                `"${row.full_name || ''}"`,
                `"${row.email || ''}"`,
                `"${row.phone || ''}"`,
                `"${row.city || ''}"`,
                `"${row.state || ''}"`,
                row.payment_amount,
                row.amount_paid,
                row.payment_status,
                row.razorpay_payment_id || '',
                new Date(row.created_at).toISOString()
            ].join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
        res.status(200).send(csvRows.join('\n'));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/email/logs', async (req, res) => {
    try {
        const { type, limit = 50 } = req.query;
        let query = supabase.from('email_logs').select('*');
        if (type) query = query.eq('type', type);
        const { data, error } = await query.order('sent_at', { ascending: false }).limit(parseInt(limit));
        if (error) throw error;
        res.status(200).json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`🚀 WhatsApp Bridge Server running on http://localhost:${PORT}`);
});
