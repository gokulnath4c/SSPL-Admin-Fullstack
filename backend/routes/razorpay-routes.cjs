const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase.cjs');
const { verifyWebhookSignature } = require('../services/razorpay-service.cjs');
const { reconcile } = require('../services/reconciliation-service.cjs');

// Store active SSE clients
const sseClients = new Map(); // registrationId -> res

// SSE Endpoint
router.get('/sse/:registrationId', (req, res) => {
    const { registrationId } = req.params;
    console.log(`SSE Connection attempt for: ${registrationId}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Store client
    sseClients.set(registrationId, res);

    // Keep alive packet
    const keepAlive = setInterval(() => {
        res.write(':\n\n');
    }, 20000);

    req.on('close', () => {
        console.log(`SSE Connection closed: ${registrationId}`);
        clearInterval(keepAlive);
        sseClients.delete(registrationId);
    });
});

// Helper to notify client
const notifyClient = (registrationId, data) => {
    const client = sseClients.get(registrationId);
    if (client) {
        console.log(`Notifying client ${registrationId} of success`);
        client.write(`event: payment_success\n`);
        client.write(`data: ${JSON.stringify(data)}\n\n`);
    } else {
        console.log(`No active SSE client found for ${registrationId}`);
    }
};

// Webhook Handler
router.post('/webhooks/razorpay', async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.VITE_RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    if (!verifyWebhookSignature(body, signature, secret)) {
        return res.status(400).json({ status: 'error', message: 'Invalid Signature' });
    }

    const { event, payload } = req.body;
    console.log(`Received Razorpay Webhook: ${event}`);

    // Upsert to Ledger
    const payment = payload.payment ? payload.payment.entity : null;
    if (payment) {
        const record = {
            payment_id: payment.id,
            order_id: payment.order_id,
            amount: payment.amount / 100,
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            email: payment.email,
            contact: payment.contact,
            fee: payment.fee ? payment.fee / 100 : null,
            tax: payment.tax ? payment.tax / 100 : null,
            created_at: new Date(payment.created_at * 1000).toISOString(),
            captured_at: payment.captured ? new Date(payment.created_at * 1000).toISOString() : null,
            raw_payload: payload,
            last_synced_at: new Date().toISOString()
        };

        await supabase
            .from('razorpay_ledger')
            .upsert(record, { onConflict: 'payment_id' });

        // --- NEW: Sync to player_registrations ---
        if (payment.status === 'captured') {
            const notes = payload.payment.entity.notes || {};
            const regId = notes.registrationId || notes.registration_id;
            
            if (regId) {
                // Direct update by ID
                await supabase
                    .from('player_registrations')
                    .update({ 
                        payment_status: 'captured', 
                        status: 'paid',
                        razorpay_payment_id: payment.id,
                        amount_paid: payment.amount / 100
                    })
                    .eq('id', regId);
            } else {
                // Fallback: match by email or phone
                const phone = normalize(payment.contact);
                const email = String(payment.email || '').toLowerCase();
                
                if (phone || email) {
                    let matchQuery = supabase.from('player_registrations').update({ 
                        payment_status: 'captured', 
                        status: 'paid',
                        razorpay_payment_id: payment.id,
                        amount_paid: payment.amount / 100
                    });

                    if (phone && email) {
                        matchQuery = matchQuery.or(`phone.ilike.%${phone}%,email.ilike.%${email}%`);
                    } else if (phone) {
                        matchQuery = matchQuery.ilike('phone', `%${phone}%`);
                    } else {
                        matchQuery = matchQuery.eq('email', email);
                    }
                    
                    await matchQuery;
                }
            }
        }
        // --- End Sync ---

        // Notify Frontend via SSE
        const notes = payload.payment.entity.notes || {};
        const regId = notes.registrationId || notes.registration_id;
        if (regId) {
            notifyClient(regId, {
                paymentId: payment.id,
                status: payment.status
            });
        }
    }

    res.json({ status: 'ok' });
});

// Admin API: Transactions
router.get('/admin/razorpay/transactions', async (req, res) => {
    // Authenticate user here (Skipped for brevity/safe assumption of internal use or added middleware)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { status, search, from, to, view } = req.query;
    console.log('Fetching transactions...', { page, limit, view, status, search });

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    if (view === 'net_failed') {
        // Special logic for Net Failed: Failed attempts with no successful capture for same contact
        try {
            // 1. Fetch all unique captured contacts
            const { data: capturedData, error: cError } = await supabase
                .from('razorpay_ledger')
                .select('email, contact')
                .eq('status', 'captured');
            
            if (cError) throw cError;

            const normalize = (num) => {
                if (!num) return '';
                let s = String(num).replace(/\D/g, '');
                if (s.startsWith('91') && s.length > 10) s = s.substring(2);
                return s.slice(-10);
            };

            const capturedEmails = new Set(capturedData.map(d => String(d.email || '').toLowerCase()).filter(e => e));
            const capturedPhones = new Set(capturedData.map(d => normalize(d.contact)).filter(p => p));

            // 2. Fetch all failed transactions
            const { data: failedData, error: fError } = await supabase
                .from('razorpay_ledger')
                .select('*')
                .eq('status', 'failed')
                .order('created_at', { ascending: false });

            if (fError) throw fError;

            // 3. Filter and Deduplicate
            const seen = new Set();
            let netFailed = failedData.filter(tx => {
                const phone = normalize(tx.contact);
                const email = String(tx.email || '').toLowerCase();
                const matchedPhone = phone && capturedPhones.has(phone);
                const matchedEmail = email && capturedEmails.has(email);
                
                if (matchedPhone || matchedEmail) return false;

                // Deduplicate: Keep only the first (latest, since sorted by created_at)
                const key = (phone || '') + '|' + (email || '');
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            // 4. Apply search if present
            if (search) {
                const s = search.toLowerCase();
                netFailed = netFailed.filter(tx => 
                    String(tx.payment_id || '').toLowerCase().includes(s) || 
                    String(tx.email || '').toLowerCase().includes(s)
                );
            }

            // 5. Apply pagination
            const total = netFailed.length;
            const data = netFailed.slice(start, start + limit);

            return res.json({
                data: data.map(tx => ({
                    ...tx,
                    razorpay_dashboard_url: `https://dashboard.razorpay.com/app/payments/${tx.payment_id}`
                })),
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: total
                }
            });

        } catch (err) {
            console.error('Net Failed Query Error:', err);
            return res.status(500).json({ error: 'Failed to process Net Failed view' });
        }
    }

    let query = supabase
        .from('razorpay_ledger')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end);

    if (status) query = query.eq('status', status);
    if (search) query = query.or(`email.ilike.%${search}%,payment_id.ilike.%${search}%,contact.ilike.%${search}%`);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query;

    if (error) return res.status(500).json({ error: error.message });

    // Add dashboard URL
    const enriched = (data || []).map(tx => ({
        ...tx,
        razorpay_dashboard_url: `https://dashboard.razorpay.com/app/payments/${tx.payment_id}`
    }));

    res.json({
        data: enriched,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total: count
        }
    });
});

// Helper to fetch all rows from Supabase bypassing 1000 record limit
async function fetchAllRows(baseQuery) {
    let allData = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    while (hasMore) {
        const start = page * pageSize;
        const end = start + pageSize - 1;

        // Clone query (or re-apply range) - Supabase query objects are mutable/chainable? 
        // Better to re-build query or use range on the chain. 
        // Actually, Supabase queries aren't easily cloneable if already built. 
        // We need to pass a query builder *function* or just handle the range carefully.
        // Let's assume passed query is 'then-able' but we need to chain .range() on it.
        // But we can't chain .range() multiple times on same object instance usually.

        // Safer approach: We cannot reuse the `query` object for multiple awaits with different ranges easily in one go 
        // without re-constructing it.
        // Let's restructure the route to build query inside loop or use specific logic.

        // Actually, let's just write the loop inside the route handlers for clarity.
        hasMore = false; // logic moved to handler
    }
    return allData;
}

// Admin API: Export CSV
router.get('/admin/razorpay/export', async (req, res) => {
    try {
        const { status, search, from, to } = req.query;
        console.log('Exporting transactions...', { status, from, to });

        let allData = [];
        let hasMore = true;
        let page = 0;
        const PAGE_SIZE = 1000;

        while (hasMore) {
            let query = supabase
                .from('razorpay_ledger')
                .select('*')
                .order('created_at', { ascending: false })
                .range(page * PAGE_SIZE, (page * PAGE_SIZE) + PAGE_SIZE - 1);

            if (status) query = query.eq('status', status);
            if (search) query = query.or(`email.ilike.%${search}%,payment_id.ilike.%${search}%,contact.ilike.%${search}%`);
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to);

            const { data, error } = await query;
            if (error) throw error;

            if (data.length > 0) {
                allData = [...allData, ...data];
                page++;
                if (data.length < PAGE_SIZE) hasMore = false;
            } else {
                hasMore = false;
            }
        }

        // Convert JSON to CSV
        const headers = ['Payment ID', 'Order ID', 'Amount', 'Status', 'Email', 'Contact', 'Method', 'Date', 'Fee', 'Tax'];
        let csv = headers.join(',') + '\n';

        allData.forEach(tx => {
            const row = [
                tx.payment_id,
                tx.order_id || '',
                tx.amount,
                tx.status,
                tx.email || '',
                tx.contact || '',
                tx.method || '',
                new Date(tx.created_at).toISOString(),
                tx.fee || 0,
                tx.tax || 0
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
            csv += row + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=transactions_${new Date().toISOString().split('T')[0]}.csv`);
        res.status(200).send(csv);

    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).send('Error generating export');
    }
});

// Admin API: Stats
router.get('/admin/razorpay/stats', async (req, res) => {
    try {
        const { status, search, from, to, view } = req.query;
        console.log('Fetching stats...', { view, status, search });

        let allData = [];
        let hasMore = true;
        let page = 0;
        const PAGE_SIZE = 1000;

        while (hasMore) {
            let query = supabase
                .from('razorpay_ledger')
                .select('amount, status, email, contact')
                .range(page * PAGE_SIZE, (page * PAGE_SIZE) + PAGE_SIZE - 1);

            if (status && view !== 'net_failed') query = query.eq('status', status);
            if (search) query = query.or(`email.ilike.%${search}%,payment_id.ilike.%${search}%,contact.ilike.%${search}%`);
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to);

            const { data, error } = await query;
            if (error) throw error;

            if (data.length > 0) {
                allData = [...allData, ...data];
                page++;
                if (data.length < PAGE_SIZE) hasMore = false;
            } else {
                hasMore = false;
            }
        }

        const stats = {
            total_count: allData.length,
            total_volume: 0,
            success_count: 0,
            success_volume: 0,
            failed_count: 0,
            net_failed_count: 0
        };

        const normalize = (num) => {
            if (!num) return '';
            let s = String(num).replace(/\D/g, '');
            if (s.startsWith('91') && s.length > 10) s = s.substring(2);
            return s.slice(-10);
        };

        const capturedData = allData.filter(d => d.status === 'captured');
        const capturedEmails = new Set(capturedData.map(d => String(d.email || '').toLowerCase()).filter(e => e));
        const capturedPhones = new Set(capturedData.map(d => normalize(d.contact)).filter(p => p));

        const seenNetFailed = new Set();

        allData.forEach(tx => {
            const amount = Number(tx.amount) || 0;
            stats.total_volume += amount;

            if (tx.status === 'captured' || tx.status === 'authorized') {
                stats.success_count++;
                stats.success_volume += amount;
            } else if (tx.status === 'failed') {
                stats.failed_count++;
                // Check if it's a "Net Failed"
                const phone = normalize(tx.contact);
                const email = String(tx.email || '').toLowerCase();
                const isCaptured = (phone && capturedPhones.has(phone)) || (email && capturedEmails.has(email));
                if (!isCaptured) {
                    const key = (phone || '') + '|' + (email || '');
                    if (!seenNetFailed.has(key)) {
                        stats.net_failed_count++;
                        seenNetFailed.add(key);
                    }
                }
            }
        });

        res.json(stats);
    } catch (error) {
        console.error('Stats Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin API: Reconcile
router.get('/admin/razorpay/reconcile', async (req, res) => {
    let { from, to } = req.query;
    
    // Default to last 7 days if from is missing
    if (!from) {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        from = d.toISOString();
        console.log(`No 'from' date provided, defaulting to last 7 days: ${from}`);
    }

    const result = await reconcile(from, to);
    res.json(result);
});

// Admin API: Reports (Bypass broken RPCs)
router.get('/admin/reports/finance', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('razorpay_ledger')
            .select('*')
            .in('status', ['captured', 'authorized', 'completed'])
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Reports Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
