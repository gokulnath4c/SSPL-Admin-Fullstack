import React, { useState, useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { 
    RefreshCw, 
    Send, 
    Database, 
    MessageSquare, 
    Plus, 
    Trash2, 
    Loader2, 
    Power, 
    CheckCircle2, 
    QrCode,
    Users,
    Users2,
    Power as PowerIcon,
    Smartphone,
    Link2,
    Search,
    Filter,
    Zap,
    X,
    Info
} from 'lucide-react';
import { config } from '@lib/config';
import ssplLogo from '../assets/sspl-logo.png';


interface Campaign {
    id: string;
    name: string;
    message_template: string;
    status: string;
    created_at: string;
    recipient_count?: number;
    total_sent?: number;
    instance_name?: string;
    use_buttons?: boolean;
    buttons_config?: any;
}

interface Recipient {
    id: string;
    mobile: string;
    name?: string;
    status: 'PENDING' | 'SENT' | 'FAILED' | 'READ';
    error_message?: string;
    sent_at?: string;
    created_at: string;
}

const API_BASE_URL = config.api.url;


export default function WhatsAppMarketingPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isSending, setIsSending] = useState<string | null>(null);
    const [useButtons, setUseButtons] = useState(false);

    
    // Evolution API Connection State
    const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'OFFLINE'>('OFFLINE');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [instanceName] = useState('sspl_admin');

    // New Campaign State
    const [newName, setNewName] = useState('');
    const [newTemplate, setNewTemplate] = useState(`Hi Hero, 👋

Your cricket journey starts here! 🏏 Thank you for visiting Southern Street Premier League (SSPL). We’re excited to see your talent on the pitch!

SSPL inviting your friends and family to join our Tennis Ball Cricket League.

Don't wait—complete your trial registration now and secure your spot: 👉 https://ssplt10.co.in/trial-results

Follow us for more updates:
📺 YouTube: https://www.youtube.com/@Southernstreetpremierleague
📸 Instagram: https://instagram.com/ssplt10

Need help? Just reply to this message and we'll get you sorted! 🚀

– Team SSPL`);



    const [targetGroup, setTargetGroup] = useState('manual'); // manual, level1, level2, level3, single
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [singleMobile, setSingleMobile] = useState('');

    const [activeTab, setActiveTab] = useState<'campaigns' | 'groups' | 'status' | 'leads'>('campaigns');
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    const [recipientStatusData, setRecipientStatusData] = useState<Recipient[]>([]);
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusSearch, setStatusSearch] = useState('');
    const [groupSubject, setGroupSubject] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    // Contact Selection State
    const [allContacts, setAllContacts] = useState<any[]>([]);
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [contactSearch, setContactSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState<'all' | '1' | '2' | '3'>('all');
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [smartJoin, setSmartJoin] = useState(true);
    const [customNumbers, setCustomNumbers] = useState('');
    const [safeMode, setSafeMode] = useState(true);
    const [batchSize, setBatchSize] = useState(100);

    // Group List State
    const [existingGroups, setExistingGroups] = useState<any[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [editingGroup, setEditingGroup] = useState<{id: string, subject: string} | null>(null);
    const [workerLogs, setWorkerLogs] = useState<any[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    // Multi-Instance State
    const [instances, setInstances] = useState<any[]>([]);
    const [selectedInstanceName, setSelectedInstanceName] = useState('sspl_admin');
    const [instanceToDelete, setInstanceToDelete] = useState<string | null>(null);

    // Lead Generator State
    const [baseNumber, setBaseNumber] = useState('919876543000');
    const [genCount, setGenCount] = useState(100);
    const [isFiltering, setIsFiltering] = useState(false);
    const [filteredLeads, setFilteredLeads] = useState<any[]>([]);
    const [genProgress, setGenProgress] = useState({ current: 0, total: 0 });

    // Shared Gateway State
    const [gateways, setGateways] = useState<any[]>([]);
    const [isGatewaysModalOpen, setIsGatewaysModalOpen] = useState(false);
    const [newGateway, setNewGateway] = useState({ name: '', apikey: '', phone: '' });

    // Manual Registration State
    const [isManualRegisterOpen, setIsManualRegisterOpen] = useState(false);
    const [manualPhone, setManualPhone] = useState('');
    const [manualOTP, setManualOTP] = useState('');
    const [manualStep, setManualStep] = useState(1); // 1: phone, 2: otp
    const [isManualLoading, setIsManualLoading] = useState(false);


    const loadCampaigns = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            const res = await fetch(`${API_BASE_URL}/whatsapp/campaigns`);
            if (!res.ok) throw new Error('Failed to load campaigns from API');
            
            const data = await res.json();
            setCampaigns(data);
        } catch (error) {
            console.error('Failed to load campaigns', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const loadGateways = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/whatsapp/gateways`);
            const data = await res.json();
            setGateways(data);
        } catch (e) {
            console.error('Failed to load gateways', e);
        }
    };

    const handleAddGateway = async () => {
        if (!newGateway.name || !newGateway.apikey) return;
        try {
            const res = await fetch(`${API_BASE_URL}/whatsapp/gateways`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newGateway)
            });
            if (res.ok) {
                setNewGateway({ name: '', apikey: '', phone: '' });
                loadGateways();
            }
        } catch (e) {
            alert('Failed to add gateway');
        }
    };

    const handleDeleteGateway = async (id: string) => {
        if (!window.confirm('Delete this gateway?')) return;
        try {
            await fetch(`${API_BASE_URL}/whatsapp/gateways/${id}`, { method: 'DELETE' });
            loadGateways();
        } catch (e) {
            alert('Failed to delete');
        }
    };

    const loadContacts = async () => {
        try {
            setLoadingContacts(true);
            const { data, error } = await supabase
                .from('trial_candidates')
                .select(`
                    id,
                    name,
                    mobile,
                    trial_progress(current_level)
                `);

            if (error) throw error;
            
            const formatted = data.map((c: any) => ({
                ...c,
                level: (c.trial_progress as any)?.[0]?.current_level?.toString() || '0'
            }));

            setAllContacts(formatted);
        } catch (error) {
            console.error('Failed to load contacts', error);
        } finally {
            setLoadingContacts(false);
        }
    };

    const loadWorkerLogs = async () => {
        try {
            // Priority 1: Fetch from Bridge Server Memory (Real-time)
            const res = await fetch(`${API_BASE_URL}/whatsapp/workers/logs`);
            
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setWorkerLogs(data);
                    return; // Success
                }
            } else {
                console.warn(`[WorkerLogs] Bridge returned status ${res.status}`);
            }

            // Priority 2: Fallback to Supabase (History)
            const { data: dbLogs } = await supabase
                .from('whatsapp_worker_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (dbLogs) setWorkerLogs(dbLogs || []);
        } catch (error) {
            console.error('Failed to load logs', error);
        }
    };

    const loadGroups = async () => {
        if (connectionStatus !== 'CONNECTED') return;
        try {
            setLoadingGroups(true);
            const res = await fetch(`${API_BASE_URL}/whatsapp/groups/${selectedInstanceName}`);
            const data = await res.json();
            // Evolution API returns an array, sometimes directly or in a key
            setExistingGroups(Array.isArray(data) ? data : (data.groups || []));
        } catch (error) {
            console.error('Failed to load groups', error);
        } finally {
            setLoadingGroups(false);
        }
    };

    const loadInstances = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/whatsapp/instance`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setInstances(data);
                
                // Update connection status based on selected instance
                const selected = data.find(i => i.instance?.instanceName === selectedInstanceName);
                if (selected) {
                    const state = selected.connectionStatus;
                    if (state === 'open' || state === 'CONNECTED') setConnectionStatus('CONNECTED');
                    else if (state === 'connecting' || state === 'QR_READY') setConnectionStatus('CONNECTING');
                    else setConnectionStatus('DISCONNECTED');
                }
            }
        } catch (error) {
            console.error('Failed to load instances', error);
            setConnectionStatus('OFFLINE');
        }
    };

    const handleGenerateLeads = async () => {
        if (connectionStatus !== 'CONNECTED') {
            alert('Please connect a WhatsApp instance first to verify numbers.');
            return;
        }

        try {
            setIsFiltering(true);
            setGenProgress({ current: 0, total: genCount });

            const res = await fetch(`${API_BASE_URL}/whatsapp/generate-and-filter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    baseNumber,
                    count: genCount,
                    instanceName: selectedInstanceName
                })
            });

            if (!res.ok) throw new Error('Generation failed');

            const data = await res.json();
            setFilteredLeads(data.validNumbers || []);
            alert(`Found ${data.validCount} valid WhatsApp numbers!`);
        } catch (error: any) {
            alert('Error generating leads: ' + error.message);
        } finally {
            setIsFiltering(false);
        }
    };

    const createCampaignFromLeads = () => {
        if (filteredLeads.length === 0) return;
        setNewName(`Leads ${baseNumber} - ${new Date().toLocaleDateString()}`);
        setTargetGroup('manual');
        // We'll use the filteredLeads when handleCreateCampaign is called
        alert(`${filteredLeads.length} leads loaded into campaign creator. Give your campaign a name and template, then click "Create Campaign".`);
        setActiveTab('campaigns');
    };

    const handleAutoGenerateSender = async () => {
        alert('Auto-generation is disabled. Please use Shared Gateways or Manual Register.');
    };

    const handleManualRequestCode = async () => {
        if (!manualPhone || manualPhone.length < 10) {
            alert('Please enter a valid phone number with country code (e.g. 919876543210)');
            return;
        }

        try {
            setIsManualLoading(true);
            const instanceName = `manual_${Date.now()}`;
            setSelectedInstanceName(instanceName);

            const res = await fetch(`${API_BASE_URL}/whatsapp/manual-request-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceName, phoneNumber: manualPhone.replace('+', '') })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to request code');
            }

            setManualStep(2);
            alert('Registration code requested! Please wait for the SMS on your chosen number.');
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setIsManualLoading(false);
        }
    };

    const handleManualRegister = async () => {
        if (!manualOTP || manualOTP.length < 4) {
            alert('Please enter the OTP code');
            return;
        }

        try {
            setIsManualLoading(true);
            const res = await fetch(`${API_BASE_URL}/whatsapp/manual-register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceName: selectedInstanceName, code: manualOTP })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Registration failed');
            }

            alert('Registration Successful! New sender added.');
            setIsManualRegisterOpen(false);
            setManualPhone('');
            setManualOTP('');
            setManualStep(1);
            loadInstances();
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setIsManualLoading(false);
        }
    };
    
    const loadRecipientStatuses = async (campaignId: string) => {
        if (!campaignId || campaignId.length < 32) return; 
        try {
            setStatusLoading(true);
            const res = await fetch(`${API_BASE_URL}/whatsapp/campaign/${campaignId}/recipients`);
            if (!res.ok) throw new Error('Failed to load recipients');
            
            const data = await res.json();
            setRecipientStatusData(data || []);
        } catch (error) {
            console.error('Failed to load recipient statuses', error);
        } finally {
            setStatusLoading(false);
        }
    };

    const checkConnection = async () => {
        await loadInstances();
        try {
            const res = await fetch(`${API_BASE_URL}/whatsapp/state/${selectedInstanceName}`);
            const data = await res.json();
            
            const state = data.instance?.state;
            
            if (state === 'open' || state === 'CONNECTED') {
                setConnectionStatus('CONNECTED');
                setQrCode(null);
            } else if (state === 'connecting' || state === 'QR_READY') {
                setConnectionStatus('CONNECTING');
                // Auto-fetch QR if we don't have it
                if (!qrCode) {
                    const qrRes = await fetch(`${API_BASE_URL}/whatsapp/qr/${selectedInstanceName}`);
                    const qrData = await qrRes.json();
                    if (qrData.base64 || qrData.qrcode) {
                        setQrCode(qrData.base64 || qrData.qrcode);
                    }
                }
            } else {
                setConnectionStatus('DISCONNECTED');
                setQrCode(null);
            }
        } catch (err) {
            console.error('WhatsApp connection check failed:', err);
            setConnectionStatus('OFFLINE');
        }
    };



    const connectWhatsApp = async () => {
        try {
            setConnectionStatus('CONNECTING');
            // 1. Create instance
            const res = await fetch(`${API_BASE_URL}/whatsapp/instance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceName: selectedInstanceName })
            });

            const data = await res.json();
            if (data.offline) {
                alert(data.message || 'Evolution API is offline. Please start Docker Desktop.');
                setConnectionStatus('OFFLINE');
                return;
            }

            // 2. Get QR
            const qrRes = await fetch(`${API_BASE_URL}/whatsapp/qr/${selectedInstanceName}`);
            const qrData = await qrRes.json();
            if (qrData.base64) {
                setQrCode(qrData.base64);
            }
        } catch (err) {
            alert('Failed to connect. Is the Evolution API server running?');
            setConnectionStatus('OFFLINE');
        }
    };

    const disconnectWhatsApp = async (name?: string) => {
        const targetName = name || selectedInstanceName;
        if (!confirm(`Are you sure you want to disconnect ${targetName}?`)) return;
        try {
            await fetch(`${API_BASE_URL}/whatsapp/instance/${targetName}`, { method: 'DELETE' });
            if (targetName === selectedInstanceName) {
                setConnectionStatus('DISCONNECTED');
                setQrCode(null);
            }
            loadInstances();
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadCampaigns();
        loadContacts();
        loadInstances();
        const interval = setInterval(() => {
            loadCampaigns(true);
            checkConnection();
        }, 15000); // Check every 15s
        return () => clearInterval(interval);
    }, [selectedInstanceName]);

    // Initial Data Load
    useEffect(() => {
        loadCampaigns();
        loadGateways();
        loadInstances();
        loadContacts();
        loadWorkerLogs();
        
        const timer = setInterval(loadInstances, 15000);
        return () => clearInterval(timer);
    }, []);

    // Poll for progress updates if any campaign is IN_PROGRESS
    useEffect(() => {
        const hasInProgress = campaigns.some(c => c.status === 'IN_PROGRESS');
        if (hasInProgress) {
            const progressInterval = setInterval(() => {
                loadCampaigns(true);
                loadWorkerLogs();
            }, 5000);
            return () => clearInterval(progressInterval);
        }
    }, [campaigns]);


    useEffect(() => {
        if (activeTab === 'groups' && connectionStatus === 'CONNECTED') {
            loadGroups();
        }
    }, [activeTab, connectionStatus]);

    useEffect(() => {
        if (activeTab === 'status') {
            loadCampaigns(true);
            
            if (selectedCampaignId && activeTab === 'status') {
                loadRecipientStatuses(selectedCampaignId);
                // Auto-refresh every 10 seconds if on status tab
                const interval = setInterval(() => loadRecipientStatuses(selectedCampaignId), 10000);
                return () => clearInterval(interval);
            }
        }
    }, [activeTab, selectedCampaignId]);

    useEffect(() => {
        if (activeTab === 'status' && !selectedCampaignId && campaigns.length > 0) {
            setSelectedCampaignId(campaigns[0].id);
        }
    }, [activeTab, campaigns]);

    const toggleContact = (id: string) => {
        const next = new Set(selectedContactIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedContactIds(next);
    };

    const toggleAllContacts = (currentList: any[]) => {
        const next = new Set(selectedContactIds);
        const allSelected = currentList.every(c => next.has(c.id));
        
        if (allSelected) {
            currentList.forEach(c => next.delete(c.id));
        } else {
            currentList.forEach(c => next.add(c.id));
        }
        setSelectedContactIds(next);
    };

    const filteredContacts = allContacts.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(contactSearch.toLowerCase()) || 
                             c.mobile.includes(contactSearch);
        const matchesLevel = levelFilter === 'all' || c.level === levelFilter;
        return matchesSearch && matchesLevel;
    });

    const handleCreateCampaign = async () => {
        if (!newName || !newTemplate) {
            alert('Name and Template are required');
            return;
        }

        try {
            setIsCreating(true);
            let recipientList: any[] = [];

            if (targetGroup === 'manual' && (csvFile || filteredLeads.length > 0)) {
                if (filteredLeads.length > 0) {
                    recipientList = filteredLeads;
                } else if (csvFile) {
                    const text = await csvFile.text();
                    const lines = text.split('\n').filter(l => l.trim());
                    recipientList = lines.slice(1).map(line => {
                        const [name, mobile] = line.split(',');
                        return {
                            name: name?.trim(),
                            mobile: mobile?.trim()
                        };
                    }).filter(r => r.mobile);
                }
            } else if (targetGroup.startsWith('level')) {
                const level = parseInt(targetGroup.replace('level', ''));
                const { data: players, error: pError } = await supabase
                    .from('trial_candidates')
                    .select('name, mobile, trial_progress!inner(current_level)')
                    .eq('trial_progress.current_level', level);

                if (pError) throw pError;

                recipientList = players.map((p: any) => ({
                    name: p.name,
                    mobile: p.mobile
                }));
            } else if (targetGroup === 'single' && singleMobile) {
                recipientList = [{
                    name: 'Recipient',
                    mobile: singleMobile.trim()
                }];
            }

            const res = await fetch(`${API_BASE_URL}/whatsapp/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    message_template: newTemplate,
                    use_buttons: useButtons,
                    recipients: recipientList
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create campaign');
            }

            alert(`Campaign "${newName}" created with ${recipientList.length} recipients.`);
            setNewName('');
            setSingleMobile('');
            setCsvFile(null);
            setFilteredLeads([]); // Clear leads after creation
            loadCampaigns();
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const runCampaignOnServer = async (campaign: Campaign) => {
        if (connectionStatus !== 'CONNECTED') {
            alert('Please connect your WhatsApp first.');
            return;
        }

        try {
            setIsSending(campaign.id);
            
            const res = await fetch(`${API_BASE_URL}/whatsapp/send-bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId: campaign.id,
                    instanceName: selectedInstanceName,
                    template: campaign.message_template,
                    useButtons: campaign.use_buttons,
                    safeMode: safeMode,
                    batchSize: batchSize
                })
            });

            const result = await res.json();
            if (result.success) {
                alert('Campaign execution started on server!');
                loadCampaigns();
            } else {
                throw new Error(result.error);
            }

        } catch (error: any) {
            alert('Sending failed: ' + error.message);
        } finally {
            setIsSending(null);
        }
    };

    const pauseCampaign = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/whatsapp/campaign/${id}/pause`, {
                method: 'POST'
            });
            const result = await res.json();
            if (result.success) {
                alert('Campaign paused');
                loadCampaigns();
            }
        } catch (error: any) {
            alert('Pause failed: ' + error.message);
        }
    };

    const markAsReady = async (id: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/whatsapp/campaign/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'READY' })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to update status');
            }

            loadCampaigns();
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    };

    const deleteCampaign = async (id: string) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/whatsapp/campaign/${id}`, {
                method: 'DELETE'
            });
            
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete campaign');
            }

            if (selectedCampaignId === id) setSelectedCampaignId('');
            alert('Campaign deleted successfully');
            loadCampaigns();
        } catch (error: any) {
            alert('Error deleting campaign: ' + (error.message || 'Unknown error.'));
        } finally {
            setLoading(false);
        }
    };

    const deleteAllCampaigns = async () => {
        const count = campaigns.length;
        if (count === 0) return;
        if (!confirm(`⚠️ WARNING: Are you sure you want to delete ALL ${count} campaigns and their history? This cannot be undone.`)) return;
        
        try {
            setLoading(true);
            // Delete all recipients first (explicit cleanup just in case CASCADE is missing)
            await supabase.from('whatsapp_campaign_recipients').delete().neq('id', '00000000-0000-4000-a000-000000000000');
            
            // Delete all campaigns
            const { error } = await supabase.from('whatsapp_campaigns').delete().neq('id', '00000000-0000-4000-a000-000000000000');
            
            if (error) throw error;
            
            setSelectedCampaignId('');
            alert('Successfully deleted all campaigns.');
            loadCampaigns();
        } catch (error: any) {
            alert('Error deleting all campaigns: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupSubject && !editingGroup) {
            alert('Please provide a group subject.');
            return;
        }

        if (selectedContactIds.size === 0 && !customNumbers.trim()) {
            alert('Please select at least one contact or enter custom numbers.');
            return;
        }

        if (connectionStatus !== 'CONNECTED') {
            alert('Please connect your WhatsApp first.');
            return;
        }

        try {
            setIsCreatingGroup(true);
            
            const rawParticipants = [
                ...allContacts
                    .filter(c => selectedContactIds.has(c.id))
                    .map(c => {
                        let num = c.mobile.trim().replace(/\D/g, '');
                        if (num.length === 10) num = '91' + num;
                        return num;
                    }),
                ...customNumbers.split(',')
                    .map(n => n.trim().replace(/\D/g, ''))
                    .filter(n => n.length >= 10)
                    .map(n => {
                        if (n.length === 10) return '91' + n;
                        return n;
                    })
            ];

            // Remove duplicates and ensure clean strings
            const uniqueParticipants = [...new Set(rawParticipants)];
            console.log('Group Participants:', uniqueParticipants);
            if (editingGroup) {
                // ADD MEMBERS MODE with Smart Join Support
                const res = await fetch(`${API_BASE_URL}/whatsapp/groups/participants`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instanceName,
                        groupJid: editingGroup?.id,
                        participants: uniqueParticipants,
                        smartJoin: smartJoin
                    }),
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || 'Failed to add members');
                }

                const result = await res.json();
                const addedCount = result.added || 0;
                const invitedCount = result.invited || 0;
                
                alert(`Member sync complete!\n✅ Added: ${addedCount}\n✉️ Privately Invited: ${invitedCount}`);
                setEditingGroup(null);
            } else {
                // CREATE NEW GROUP MODE
                const res = await fetch(`${API_BASE_URL}/whatsapp/create-group`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instanceName: instanceName,
                        subject: groupSubject,
                        description: groupDesc,
                        participants: uniqueParticipants
                    })
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || 'Failed to create group');
                }

                const result = await res.json();
                const addedCount = result.added || 0;
                const invitedCount = result.invited || 0;

                alert(`Success! Group "${groupSubject}" created.\n✅ Added: ${addedCount}\n✉️ Privately Invited: ${invitedCount}`);
                
                setGroupSubject('');
                setGroupDesc('');
            }
            
            setSelectedContactIds(new Set());
        } catch (err: any) {
            alert('Group action failed: ' + err.message);
        } finally {
            setIsCreatingGroup(false);
            loadGroups();
        }
    };

    const handleLeaveGroup = async (groupJid: string, groupSubject: string) => {
        if (!window.confirm(`Are you sure you want to LEAVE the group "${groupSubject}"? \n\nThis will remove your WhatsApp account from this group.`)) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/whatsapp/groups/${instanceName}?groupJid=${groupJid}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to leave group');
            }

            alert(`Successfully left group "${groupSubject}"`);
            loadGroups();
        } catch (err: any) {
            alert('Failed to leave group: ' + err.message);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <img src={ssplLogo} className="w-12 h-12 object-contain" alt="SSPL" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 font-sans tracking-tight">WhatsApp Marketing</h1>
                        <div className="text-gray-600 mt-1 flex items-center gap-2">
                            Session: 
                            <select 
                                value={selectedInstanceName}
                                onChange={(e) => {
                                    if (e.target.value === 'new_session') {
                                        const name = prompt('Enter a name for the new session (e.g. sales_num1):');
                                        if (name) {
                                            setSelectedInstanceName(name);
                                            // Trigger connection for new name
                                            setTimeout(() => connectWhatsApp(), 100);
                                        }
                                    } else {
                                        setSelectedInstanceName(e.target.value);
                                    }
                                }}
                                className="bg-blue-50 border-none text-blue-700 font-bold px-2 py-1 rounded cursor-pointer outline-none"
                            >
                                    <option value="sspl_admin">sspl_admin (Default)</option>
                                    {instances.map(i => (
                                        <option key={i.instance?.instanceName || Math.random()} value={i.instance?.instanceName}>
                                            {i.instance?.instanceName} ({i.connectionStatus})
                                        </option>
                                    ))}
                                    <optgroup label="Shared Gateways (CallMeBot)">
                                        {(gateways || []).map((g: any) => (
                                            <option key={g.id} value={`callmebot_${g.id}`}>
                                                {g.name} ({g.phone || 'Bot'})
                                            </option>
                                        ))}
                                    </optgroup>
                                    <option value="new_session">+ Create New Session</option>
                                </select>
                                {connectionStatus === 'CONNECTED' ? <span className="text-green-600 font-bold ml-2">● Online</span> : 
                                 connectionStatus === 'OFFLINE' ? <span className="text-amber-600 font-bold flex items-center gap-1 ml-2">● OFFLINE</span> :
                                 <span className="text-red-500 font-bold ml-2">● {connectionStatus}</span>
                                }
                                
                                <button 
                                    onClick={() => setIsGatewaysModalOpen(true)}
                                    className="ml-4 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-200 transition-all flex items-center gap-1 shadow-sm border border-blue-200"
                                >
                                    <Link2 className="w-3 h-3" />
                                    Manage Gateways
                                </button>

                            <button 
                                onClick={() => setIsManualRegisterOpen(true)}
                                className="ml-2 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-200 transition-all flex items-center gap-1 border border-gray-200"
                            >
                                <Smartphone className="w-3 h-3" />
                                Manual Register
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-lg mr-4">
                        <button 
                            onClick={() => setActiveTab('campaigns')}
                            className={`px-4 py-2 rounded-md transition-all font-bold text-sm ${activeTab === 'campaigns' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Campaigns
                        </button>
                        <button 
                            onClick={() => setActiveTab('groups')}
                            className={`px-4 py-2 rounded-md transition-all font-bold text-sm ${activeTab === 'groups' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Groups
                        </button>
                        <button 
                            onClick={() => setActiveTab('status')}
                            className={`px-4 py-2 rounded-md transition-all font-bold text-sm ${activeTab === 'status' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Status
                        </button>
                        <button 
                            onClick={() => setActiveTab('leads')}
                            className={`px-4 py-2 rounded-md transition-all font-bold text-sm ${activeTab === 'leads' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Lead Generator
                        </button>
                    </div>
                    {connectionStatus === 'CONNECTED' ? (
                        <button 
                            onClick={() => disconnectWhatsApp()}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-semibold"
                        >
                            <Power className="w-4 h-4" /> Disconnect
                        </button>
                    ) : (
                        <button 
                            onClick={() => connectWhatsApp()}
                            disabled={connectionStatus === 'CONNECTING'}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold disabled:bg-blue-300"
                        >
                            <RefreshCw className={`w-4 h-4 ${connectionStatus === 'CONNECTING' ? 'animate-spin' : ''}`} /> 
                            {connectionStatus === 'CONNECTING' ? 'Connecting...' : 'Connect WhatsApp'}
                        </button>

                    )}
                </div>
            </div>

            {qrCode ? (
                <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-blue-500 flex flex-col items-center animate-in zoom-in duration-300">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 italic">
                        <QrCode className="w-6 h-6 text-blue-600" /> Scan QR Code
                    </h2>
                    <div className="bg-gray-100 p-4 rounded-xl relative">
                        <img src={qrCode || ''} alt="WhatsApp QR Code" className="w-64 h-64" />
                    </div>
                    <p className="mt-4 text-gray-600 text-sm">Open WhatsApp &gt; Linked Devices &gt; Link a Device</p>
                </div>
            ) : connectionStatus === 'CONNECTING' && (
                <div className="bg-white p-12 rounded-xl shadow-sm border border-blue-100 flex flex-col items-center animate-pulse">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <h2 className="text-lg font-bold text-gray-800">Booting Messaging Engine...</h2>
                    <p className="text-sm text-gray-500 mt-1">Generating your secure WhatsApp QR session</p>
                </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Campaign Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 text-blue-800">
                            <h2 className="text-lg font-bold flex items-center gap-3 italic">
                                <img src={ssplLogo} className="w-6 h-6 object-contain grayscale" alt="" />
                                New Campaign
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Campaign Name</label>
                                <input 
                                    className="w-full px-4 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="e.g., Level 2 Hyderabad Trials" 
                                    value={newName} 
                                    onChange={e => setNewName(e.target.value)} 
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Message Template</label>
                                <textarea 
                                    className="w-full px-4 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[120px]"
                                    value={newTemplate} 
                                    onChange={e => setNewTemplate(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-500 italic">Use {"{name}"} for personalization.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Recipient Source</label>
                                <select 
                                    className="w-full px-4 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none bg-white"
                                    value={targetGroup} 
                                    onChange={(e) => setTargetGroup(e.target.value)}
                                >
                                    <option value="manual">Manual (CSV Upload)</option>
                                    <option value="level1">All level 1 Players</option>
                                    <option value="level2">All level 2 Players</option>
                                    <option value="level3">All level 3 Players</option>
                                    <option value="single">Single Mobile</option>
                                </select>
                            </div>

                            {targetGroup === 'single' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                                    <input 
                                        className="w-full px-4 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="919876543210" 
                                        value={singleMobile} 
                                        onChange={e => setSingleMobile(e.target.value)} 
                                    />
                                </div>
                            )}

                            {targetGroup === 'manual' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">CSV File (name, mobile)</label>
                                    <input 
                                        type="file" 
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        accept=".csv" 
                                        onChange={e => setCsvFile(e.target.files?.[0] || null)} 
                                    />
                                </div>
                            )}

                            <button 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:bg-blue-300 shadow-md"
                                onClick={handleCreateCampaign} 
                                disabled={isCreating}
                            >
                                 {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                                Create & Prepare
                            </button>
                        </div>
                    </div>
                    
                    {/* Source Selector (Shared between Campaign and Group) */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                             <Users2 className="w-4 h-4 text-blue-600" /> Selective Audience
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Contact Source</label>
                                <select 
                                    className="w-full px-4 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none bg-white"
                                    value={targetGroup} 
                                    onChange={(e) => setTargetGroup(e.target.value)}
                                >
                                    <option value="manual">Manual (CSV Upload)</option>
                                    <option value="level1">All level 1 Players</option>
                                    <option value="level2">All level 2 Players</option>
                                    <option value="level3">All level 3 Players</option>
                                    <option value="single">Single Mobile</option>
                                </select>
                            </div>

                            {targetGroup === 'single' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                                    <input 
                                        className="w-full px-4 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="919876543210" 
                                        value={singleMobile} 
                                        onChange={e => setSingleMobile(e.target.value)} 
                                    />
                                </div>
                            )}

                            {targetGroup === 'manual' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">CSV File (name, mobile)</label>
                                    <input 
                                        type="file" 
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        accept=".csv" 
                                        onChange={e => setCsvFile(e.target.files?.[0] || null)} 
                                    />
                                </div>
                            )}
                            <div className="pt-2 border-t border-gray-50">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={useButtons}
                                            onChange={e => setUseButtons(e.target.checked)}
                                        />
                                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-700">Use Interactive Buttons</span>
                                        <span className="text-[10px] text-gray-500">Option A: Register | Instagram | YouTube</span>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only peer"
                                            checked={safeMode}
                                            onChange={e => setSafeMode(e.target.checked)}
                                        />
                                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-amber-700 flex items-center gap-1">
                                            Enable Safe Mode <PowerIcon className={`w-3 h-3 ${safeMode ? 'text-amber-600' : 'text-gray-300'}`} />
                                        </span>
                                        <span className="text-[9px] text-gray-500 tracking-tight leading-tight">Increases delays to 60-180s to prevent bans.</span>
                                    </div>
                                </label>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-gray-400">Default Batch Size</label>
                                    <select 
                                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-400 outline-none"
                                        value={batchSize}
                                        onChange={e => setBatchSize(parseInt(e.target.value))}
                                    >
                                        <option value={10}>10 messages (Ultra Safe)</option>
                                        <option value={50}>50 messages (Recommended)</option>
                                        <option value={100}>100 messages</option>
                                        <option value={200}>200 messages</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2">
                    {activeTab === 'campaigns' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-100/50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="text-lg font-bold flex items-center gap-3 italic text-indigo-800">
                                    <img src={ssplLogo} className="w-6 h-6 object-contain" alt="" />
                                    Active Campaigns
                                </h2>
                                {campaigns.length > 0 && (
                                    <button 
                                        onClick={deleteAllCampaigns}
                                        className="text-xs flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-all font-bold"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete All
                                    </button>
                                )}
                            </div>
                            <div className="overflow-x-auto font-sans italic">
                                {loading ? (
                                    <div className="p-6 space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="flex flex-col gap-4 p-4 border border-gray-100 rounded-lg">
                                                <div className="flex justify-between">
                                                    <div className="space-y-2">
                                                        <div className="skeleton-shimmer h-4 w-48 rounded"></div>
                                                        <div className="skeleton-shimmer h-3 w-64 rounded opacity-60"></div>
                                                    </div>
                                                    <div className="skeleton-shimmer h-6 w-16 rounded-full"></div>
                                                </div>
                                                <div className="skeleton-shimmer h-2 w-full rounded"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (

                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4">Campaign</th>
                                                <th className="px-6 py-4">State</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {campaigns.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                                                        No campaigns found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                campaigns.map((c) => (
                                                    <React.Fragment key={c.id}>
                                                        <tr className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="font-bold text-gray-900">{c.name}</div>
                                                                <div className="text-sm text-gray-500 mt-1 line-clamp-2 italic">
                                                                    {c.message_template.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                                                                        part.match(/^https?:\/\//) ? (
                                                                            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                                                                                {part}
                                                                            </a>
                                                                        ) : part
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <div className="text-[10px] text-gray-400 uppercase">
                                                                        {c.recipient_count} recipients
                                                                    </div>
                                                                    {c.use_buttons && (
                                                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">Buttons</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                    c.status === 'READY' ? 'bg-green-100 text-green-700' :
                                                                    c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                                    c.status === 'COMPLETED' ? 'bg-gray-800 text-white' :
                                                                    'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                    {c.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end space-x-3">
                                                                    {c.status === 'DRAFT' && (
                                                                        <button 
                                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200"
                                                                            onClick={() => markAsReady(c.id)}
                                                                            title="Ready to Send"
                                                                        >
                                                                            <CheckCircle2 className="w-5 h-5" />
                                                                        </button>
                                                                    )}
                                                                    {c.status === 'READY' && (
                                                                        <button 
                                                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all shadow-sm"
                                                                            onClick={() => runCampaignOnServer(c)}
                                                                            disabled={isSending === c.id}
                                                                        >
                                                                            {isSending === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                                            Start Sending
                                                                        </button>
                                                                    )}
                                                                    {c.status === 'IN_PROGRESS' && (
                                                                        <button 
                                                                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200"
                                                                            onClick={() => pauseCampaign(c.id)}
                                                                            title="Pause Campaign"
                                                                        >
                                                                            <PowerIcon className="w-5 h-5" />
                                                                        </button>
                                                                    )}
                                                                    <button 
                                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                                                                        onClick={() => deleteCampaign(c.id)}
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {c.status === 'IN_PROGRESS' && (
                                                            <tr key={`${c.id}-progress`}>
                                                                <td colSpan={3} className="px-6 py-2 bg-blue-50/30">
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                                                <div 
                                                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                                                                                    style={{ width: `${Math.min(100, (c.total_sent || 0) / (c.recipient_count || 1)) * 100}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            <span className="text-[10px] font-bold text-blue-700 min-w-[60px]">
                                                                                {c.total_sent || 0} / {c.recipient_count}
                                                                            </span>
                                                                        </div>
                                                                        
                                                                        <div className="flex justify-between items-center">
                                                                            <button 
                                                                                onClick={() => {
                                                                                    setShowLogs(!showLogs);
                                                                                    loadWorkerLogs();
                                                                                }}
                                                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                                            >
                                                                                <MessageSquare className="w-3 h-3" />
                                                                                {showLogs ? 'Hide Live Logs' : 'View Live Logs'}
                                                                            </button>
                                                                            <span className="text-[8px] text-gray-400 italic">
                                                                                Instance: {c.instance_name || 'sspl_admin'}
                                                                            </span>
                                                                        </div>

                                                                        {showLogs && (
                                                                            <div className="mt-2 bg-gray-900 rounded-lg p-3 font-mono text-[9px] text-green-400 max-h-[150px] overflow-y-auto border border-gray-700 shadow-inner">
                                                                                {workerLogs.filter(l => l.campaign_id === c.id || !l.campaign_id).slice(0, 10).map((log, idx) => (
                                                                                    <div key={idx} className="mb-1 border-b border-gray-800 pb-1 flex justify-between">
                                                                                        <span>{log.message}</span>
                                                                                        <span className="text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                                                                                    </div>
                                                                                ))}
                                                                                {workerLogs.length === 0 && <div className="text-gray-600">Waiting for logs...</div>}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'groups' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                            <div className="bg-gray-100/50 px-6 py-4 border-b border-gray-200 flex justify-between items-center transition-colors">
                                <h2 className={`text-lg font-bold flex items-center gap-3 italic ${editingGroup ? 'text-blue-800' : 'text-green-800'}`}>
                                    <img src={ssplLogo} className="w-5 h-5 object-contain" alt="" />
                                    {editingGroup ? `Add Members to: ${editingGroup?.subject}` : 'New Group Creator'}
                                </h2>
                                <div className="flex items-center gap-3">
                                    {editingGroup && (
                                        <button 
                                            onClick={() => setEditingGroup(null)}
                                            className="text-xs text-gray-500 hover:text-red-500 font-bold transition-colors"
                                        >
                                            Cancel Editing
                                        </button>
                                    )}
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${editingGroup ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                        {selectedContactIds.size} Selected
                                    </span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-100">
                                {/* Left: Group Settings */}
                                <div className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        {!editingGroup && (
                                            <>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-700">Group Name</label>
                                                    <input 
                                                        className="w-full px-4 py-2 border border-green-100 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold"
                                                        placeholder="e.g., Level 2 Hyderabad" 
                                                        value={groupSubject}
                                                        onChange={e => setGroupSubject(e.target.value)} 
                                                    />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-700">Description</label>
                                                    <textarea 
                                                        className="w-full px-4 py-2 border border-green-100 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all min-h-[80px]"
                                                        placeholder="Group purpose..." 
                                                        value={groupDesc}
                                                        onChange={e => setGroupDesc(e.target.value)}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 flex justify-between">
                                                Custom Numbers
                                                <span className="text-[10px] text-gray-400 font-normal">Comma separated</span>
                                            </label>
                                            <input 
                                                className="w-full px-4 py-2 border border-green-100 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-xs"
                                                placeholder="e.g., 919876543210, 918887776665" 
                                                value={customNumbers}
                                                onChange={e => setCustomNumbers(e.target.value)} 
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-yellow-900">Enable Smart Join</span>
                                                <span className="text-[9px] text-yellow-700">Invite blocked users privately</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={smartJoin}
                                                    onChange={e => setSmartJoin(e.target.checked)}
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                            </label>
                                        </div>
                                        <div className="text-[10px] text-yellow-800">
                                            ⚠️ Tip: Groups work best when players have your number saved.
                                        </div>
                                    </div>

                                    <button 
                                        className={`w-full ${editingGroup ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 shadow-sm`}
                                        onClick={handleCreateGroup} 
                                        disabled={isCreatingGroup || (selectedContactIds.size === 0 && !customNumbers.trim())}
                                    >
                                        {isCreatingGroup ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingGroup ? <Users2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
                                        {editingGroup ? `Add Members to Group (${selectedContactIds.size})` : `Create Group (${selectedContactIds.size})`}
                                    </button>
                                </div>

                                {/* Right: Contact Picker */}
                                <div className="p-6 flex flex-col h-[600px]">
                                    <div className="flex gap-2 mb-4">
                                        <input 
                                            className="flex-1 px-3 py-2 border border-blue-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                            placeholder="Search contact..."
                                            value={contactSearch}
                                            onChange={e => setContactSearch(e.target.value)}
                                        />
                                        <select 
                                            className="px-2 py-2 border border-blue-50 rounded-lg text-xs outline-none bg-gray-50"
                                            value={levelFilter}
                                            onChange={e => setLevelFilter(e.target.value as any)}
                                        >
                                            <option value="all">All Levels</option>
                                            <option value="1">Lvl 1</option>
                                            <option value="2">Lvl 2</option>
                                            <option value="3">Lvl 3</option>
                                        </select>
                                    </div>

                                    <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="p-3 text-left w-10">
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded"
                                                            checked={filteredContacts.length > 0 && filteredContacts.every(c => selectedContactIds.has(c.id))}
                                                            onChange={() => toggleAllContacts(filteredContacts)}
                                                        />
                                                    </th>
                                                    <th className="p-3 text-left">Contact</th>
                                                    <th className="p-3 text-left">Lvl</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {loadingContacts ? (
                                                    [1, 2, 3, 4, 5].map(i => (
                                                        <tr key={i}>
                                                            <td className="p-3"><div className="skeleton-shimmer h-4 w-4 rounded"></div></td>
                                                            <td className="p-3">
                                                                <div className="skeleton-shimmer h-4 w-32 rounded mb-1"></div>
                                                                <div className="skeleton-shimmer h-2 w-20 rounded opacity-50"></div>
                                                            </td>
                                                            <td className="p-3"><div className="skeleton-shimmer h-4 w-8 rounded"></div></td>
                                                        </tr>
                                                    ))
                                                ) : filteredContacts.length === 0 ? (

                                                    <tr><td colSpan={3} className="p-10 text-center text-gray-400 italic">No contacts match search.</td></tr>
                                                ) : (
                                                    filteredContacts.map(c => (
                                                        <tr key={c.id} className="hover:bg-blue-50/30 cursor-pointer transition-colors" onClick={() => toggleContact(c.id)}>
                                                            <td className="p-3" onClick={e => e.stopPropagation()}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="rounded text-green-600 focus:ring-green-500"
                                                                    checked={selectedContactIds.has(c.id)}
                                                                    onChange={() => toggleContact(c.id)}
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="font-bold text-gray-800">{c.name}</div>
                                                                <div className="text-[10px] text-gray-500">{c.mobile}</div>
                                                            </td>
                                                            <td className="p-3">
                                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">
                                                                    {c.level}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* List of Existing Groups */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-8 overflow-hidden">
                                <div className="bg-gray-100/30 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                    <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
                                        <Users2 className="w-5 h-5 text-green-600" />
                                        Connected WhatsApp Groups
                                    </h3>
                                    <button 
                                        onClick={loadGroups}
                                        disabled={loadingGroups || connectionStatus !== 'CONNECTED'}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 disabled:opacity-50 transition-colors"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${loadingGroups ? 'animate-spin' : ''}`} />
                                        Refresh List
                                    </button>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50/50 sticky top-0 text-left text-xs uppercase text-gray-400 font-bold">
                                            <tr>
                                                <th className="p-4">Group Name</th>
                                                <th className="p-4">Group ID (JID)</th>
                                                <th className="p-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 italic">
                                            {loadingGroups ? (
                                                [1, 2, 3].map(i => (
                                                    <tr key={i}>
                                                        <td className="p-4"><div className="skeleton-shimmer h-4 w-40 rounded"></div></td>
                                                        <td className="p-4"><div className="skeleton-shimmer h-3 w-32 rounded opacity-50"></div></td>
                                                        <td className="p-4"><div className="skeleton-shimmer h-8 w-16 rounded"></div></td>
                                                    </tr>
                                                ))
                                            ) : existingGroups.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="p-12 text-center text-gray-400">
                                                        {connectionStatus === 'CONNECTED' ? 'No groups found. Try refreshing.' : 'Connect WhatsApp to see groups.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                existingGroups.map((group: any) => (
                                                    <tr key={group.id} className="hover:bg-green-50/20 transition-colors">
                                                        <td className="p-4 text-gray-900 font-bold">
                                                            {group.subject || group.name || 'Unnamed Group'}
                                                        </td>
                                                        <td className="p-4 text-gray-500 text-[10px] font-mono">
                                                            {group.id}
                                                        </td>
                                                        <td className="p-4 flex gap-2">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingGroup({ id: group.id, subject: group.subject || group.name });
                                                                    setSelectedContactIds(new Set());
                                                                    setCustomNumbers('');
                                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                }}
                                                                className="text-gray-400 hover:text-green-600 transition-colors p-2 rounded-lg hover:bg-green-50 flex items-center gap-1 group"
                                                                title="Add Members"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                <span className="text-[10px] hidden group-hover:block font-bold">Add Members</span>
                                                            </button>
                                                            <button 
                                                                onClick={async () => {
                                                                    try {
                                                                        const res = await fetch(`${API_BASE_URL}/whatsapp/groups/invite-code/${instanceName}?groupJid=${group.id}`);
                                                                        const data = await res.json();
                                                                        if (data.code) {
                                                                            const link = `https://chat.whatsapp.com/${data.code}`;
                                                                            navigator.clipboard.writeText(link);
                                                                            alert('Group Invite Link copied to clipboard!');
                                                                        } else {
                                                                            throw new Error('No invite code returned');
                                                                        }
                                                                    } catch (err) {
                                                                        alert('Failed to fetch invite link. Make sure you are an admin.');
                                                                    }
                                                                }}
                                                                className="text-gray-400 hover:text-purple-600 transition-colors p-2 rounded-lg hover:bg-purple-50 flex items-center gap-1 group"
                                                                title="Copy Invite Link"
                                                            >
                                                                <Link2 className="w-4 h-4" />
                                                                <span className="text-[10px] hidden group-hover:block font-bold">Copy Link</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(group.id);
                                                                    alert('Group ID copied to clipboard!');
                                                                }}
                                                                className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
                                                                title="Copy JID"
                                                            >
                                                                <RefreshCw className="w-4 h-4 rotate-45" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleLeaveGroup(group.id, group.subject || group.name || 'this group')}
                                                                className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                                                                title="Leave Group"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                    </div>
                ) : activeTab === 'leads' ? (
                    <div className="col-span-full space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-2xl shadow-xl border border-blue-50 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <Users2 className="w-8 h-8" />
                                    AI Lead Generator (FREE)
                                </h2>
                                <p className="text-blue-100 mt-1">Generate and verify WhatsApp numbers in bulk for free.</p>
                            </div>
                            
                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                                                <Database className="w-5 h-5" /> Target Parameters
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Base Mobile Number (Incl. Country Code)</label>
                                                    <input 
                                                        type="text"
                                                        value={baseNumber}
                                                        onChange={(e) => setBaseNumber(e.target.value)}
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg"
                                                        placeholder="919876543000"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity to Generate</label>
                                                    <input 
                                                        type="number"
                                                        value={genCount}
                                                        onChange={(e) => setGenCount(parseInt(e.target.value))}
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        min="10"
                                                        max="1000"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={handleGenerateLeads}
                                                    disabled={isFiltering || connectionStatus !== 'CONNECTED'}
                                                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:bg-gray-300 shadow-lg shadow-blue-200"
                                                >
                                                    {isFiltering ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Filtering WhatsApp Numbers...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Search className="w-5 h-5" />
                                                            Generate & Filter Leads
                                                        </>
                                                    )}
                                                </button>
                                                {connectionStatus !== 'CONNECTED' && (
                                                    <p className="text-red-500 text-xs text-center font-bold">⚠️ Connect WhatsApp session first</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                                            <h4 className="text-amber-800 font-bold mb-2">How it works:</h4>
                                            <ul className="text-sm text-amber-700 space-y-2 list-disc list-inside">
                                                <li>Generates numbers sequentially starting from your base number.</li>
                                                <li>Uses your connected WhatsApp session to verify presence.</li>
                                                <li>No cost per number checked.</li>
                                                <li>Safe batch processing to prevent account flags.</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-6 min-h-[400px] flex flex-col">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-lg font-bold text-gray-800">
                                                    Verified Leads ({filteredLeads.length})
                                                </h3>
                                                {filteredLeads.length > 0 && (
                                                    <button 
                                                        onClick={createCampaignFromLeads}
                                                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2"
                                                    >
                                                        <Send className="w-4 h-4" /> Create Campaign
                                                    </button>
                                                )}
                                            </div>

                                            {filteredLeads.length > 0 ? (
                                                <div className="flex-1 overflow-y-auto max-h-[400px] space-y-2 pr-2">
                                                    {filteredLeads.map((lead, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                                                                    {idx + 1}
                                                                </div>
                                                                <span className="font-mono text-gray-700">{lead.mobile}</span>
                                                            </div>
                                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Active</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                                    <Database className="w-12 h-12 mb-2 opacity-20" />
                                                    <p className="text-center italic">No leads generated yet.<br/>Start by entering a base number.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                        <div className="bg-gray-100/50 px-6 py-4 border-b border-gray-200 flex justify-between items-center transition-colors">
                            <h2 className="text-lg font-bold flex items-center gap-3 italic text-blue-800">
                                <MessageSquare className="w-5 h-5 text-blue-600" />
                                Delivery Status Tracking
                            </h2>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search mobile..."
                                        className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-400 w-48"
                                        value={statusSearch}
                                        onChange={e => setStatusSearch(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={() => loadRecipientStatuses(selectedCampaignId)}
                                    disabled={statusLoading || !selectedCampaignId}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 disabled:opacity-50 transition-colors"
                                >
                                    <RefreshCw className={`w-3 h-3 ${statusLoading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1 space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Select Campaign</label>
                                    <select 
                                        className="w-full px-4 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none bg-white font-bold text-sm"
                                        value={selectedCampaignId} 
                                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                                    >
                                        <option value="">-- Choose a Campaign --</option>
                                        {campaigns.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedCampaignId && (
                                    <div className="md:col-span-2 grid grid-cols-3 gap-4">
                                        <div className="bg-green-50 border border-green-100 p-3 rounded-lg flex flex-col items-center">
                                            <span className="text-[10px] uppercase font-bold text-green-600">Sent</span>
                                            <span className="text-xl font-bold text-green-700">
                                                {recipientStatusData.filter(r => r.status === 'SENT').length}
                                            </span>
                                        </div>
                                        <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg flex flex-col items-center">
                                            <span className="text-[10px] uppercase font-bold text-yellow-600">Pending</span>
                                            <span className="text-xl font-bold text-yellow-700">
                                                {recipientStatusData.filter(r => r.status === 'PENDING').length}
                                            </span>
                                        </div>
                                        <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex flex-col items-center">
                                            <span className="text-[10px] uppercase font-bold text-red-600">Failed</span>
                                            <span className="text-xl font-bold text-red-700">
                                                {recipientStatusData.filter(r => r.status === 'FAILED').length}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedCampaignId ? (
                                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-inner bg-gray-50/30">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100/80 text-left text-[10px] uppercase text-gray-500 font-bold sticky top-0">
                                            <tr>
                                                <th className="p-4">Recipient</th>
                                                <th className="p-4 text-center">Status</th>
                                                <th className="p-4">Time</th>
                                                <th className="p-4">Errors / Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {statusLoading && recipientStatusData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-12 text-center text-gray-400 italic">
                                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-400" />
                                                        Loading data...
                                                    </td>
                                                </tr>
                                            ) : (
                                                recipientStatusData
                                                    .filter(r => r.mobile.includes(statusSearch) || (r.name && r.name.toLowerCase().includes(statusSearch.toLowerCase())))
                                                    .map(r => (
                                                        <tr key={r.id} className="hover:bg-white transition-colors">
                                                            <td className="p-4">
                                                                <div className="font-bold text-gray-900">{r.name || 'Hero'}</div>
                                                                <div className="text-[10px] text-gray-500">{r.mobile}</div>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                    r.status === 'SENT' ? 'bg-green-100 text-green-700' :
                                                                    r.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                                    'bg-gray-100 text-gray-500'
                                                                }`}>
                                                                    {r.status}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-gray-500 text-[10px]">
                                                                {r.sent_at ? new Date(r.sent_at).toLocaleString() : '-'}
                                                            </td>
                                                            <td className="p-4 text-[10px] text-red-500 max-w-xs truncate">
                                                                {r.error_message || <span className="text-gray-300 italic">No errors</span>}
                                                            </td>
                                                        </tr>
                                                    ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-20 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                    <Database className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                    <p className="text-lg font-bold">No Campaign Selected</p>
                                    <p className="text-sm">Select a campaign from the dropdown above to view delivery details.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
            {/* Gateways Manager Modal */}
            {isGatewaysModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Link2 className="w-6 h-6" /> Shared Gateways (CallMeBot)
                            </h3>
                            <button onClick={() => setIsGatewaysModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    CallMeBot is free, but recipients MUST have opted-in by sending 
                                    <code>I allow callmebot to send me messages</code> to the bot's number first.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <input 
                                    className="px-3 py-2 border rounded-lg text-sm" 
                                    placeholder="Name (e.g. MyBot)" 
                                    value={newGateway.name}
                                    onChange={e => setNewGateway({...newGateway, name: e.target.value})}
                                />
                                <input 
                                    className="px-3 py-2 border rounded-lg text-sm" 
                                    placeholder="CallMeBot API Key" 
                                    value={newGateway.apikey}
                                    onChange={e => setNewGateway({...newGateway, apikey: e.target.value})}
                                />
                                <button 
                                    onClick={handleAddGateway}
                                    className="bg-blue-600 text-white rounded-lg font-bold py-2 hover:bg-blue-700"
                                >
                                    Add Gateway
                                </button>
                            </div>

                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {gateways.map(g => (
                                    <div key={g.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                                        <div>
                                            <p className="font-bold text-gray-900">{g.name}</p>
                                            <p className="text-xs text-gray-500 font-mono">{g.apikey}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteGateway(g.id)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
