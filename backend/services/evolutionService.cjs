const axios = require('axios');
require('dotenv').config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'sspl_secret_key_123';

/**
 * Evolution API Service for WhatsApp Automation
 */
class EvolutionService {
    constructor() {
        this.client = axios.create({
            baseURL: EVOLUTION_API_URL,
            headers: {
                'apikey': EVOLUTION_API_KEY,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Create or fetch a WhatsApp instance
     */
    async createInstance(instanceName) {
        try {
            const response = await this.client.post('/instance/create', {
                instanceName: instanceName,
                token: '',
                integration: 'WHATSAPP-BAILEYS',
                qrcode: true,
                description: 'SSPL Admin WhatsApp Instance',
                alwaysOnline: false,
                rejectCall: false,
                groupsIgnore: true
            });
            return response.data;
        } catch (error) {
            console.error('Error creating Evolution instance:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Fetch all instances
     */
    async fetchInstances() {
        try {
            const response = await this.client.get('/instance/fetchInstances');
            return response.data;
        } catch (error) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                console.warn('Evolution API is offline. Returning empty instance list.');
                return [];
            }
            console.error('Error fetching Evolution instances:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get QR Code for an instance
     */
    async getQrCode(instanceName) {
        try {
            const response = await this.client.get(`/instance/connect/${instanceName}`);
            return response.data;
        } catch (error) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                console.warn('Evolution API is offline. QR code fetch failed.');
                return { base64: null, message: 'Evolution API is offline' };
            }
            // If already connected or not found, return a structure that won't break the UI
            if (error.response?.status === 404) {
                return { base64: null, message: 'Instance already connected or not ready' };
            }
            console.error('Error getting QR code:', error.response?.data || error.message);
            throw error;
        }
    }


    /**
     * Check connection state
     */
    async getConnectionState(instanceName) {
        try {
            const response = await this.client.get(`/instance/connectionState/${instanceName}`);
            return response.data;
        } catch (error) {
            // Handle service down
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                console.warn('Evolution API is offline or unreachable.');
                return { instance: { state: 'OFFLINE' } };
            }
            // Handle instance not created yet (404)
            if (error.response?.status === 404) {
                return { instance: { state: 'OFFLINE' }, message: 'Instance not found' };
            }
            console.error('Error checking connection state:', error.response?.data || error.message);
            throw error;
        }
    }



    /**
     * Send a text message
     */
    async sendMessage(instanceName, number, text) {
        try {
            const response = await this.client.post(`/message/sendText/${instanceName}`, {
                number: number,
                text: text,
                linkPreview: true
            });
            return response.data;
        } catch (error) {
            const errorData = error.response?.data || error.message;
            console.error(`Error sending message to ${number}:`, JSON.stringify(errorData, null, 2));
            throw error;
        }
    }

    /**
     * Send an interactive button message (Baileys compatible)
     * @param {string} instanceName 
     * @param {string} number 
     * @param {string} text 
     * @param {Array} buttons - Array of { type: 'url'|'reply', displayText: string, url?: string }
     */
    async sendButtonMessage(instanceName, number, text, buttons = []) {
        try {
            // For Evolution API v2 with Baileys, we often use the /message/sendButtons endpoint
            // Payload structure: { number, buttons, text, footer }
            const response = await this.client.post(`/message/sendButtons/${instanceName}`, {
                number: number,
                text: text,
                footer: 'SSPL Powered by AI', // Optional footer
                buttons: buttons.map(b => ({
                    type: b.type === 'url' ? 'url' : 'reply',
                    displayText: b.displayText,
                    url: b.url
                }))
            });
            return response.data;
        } catch (error) {
            const errorData = error.response?.data || error.message;
            console.error(`Error sending button message to ${number}:`, JSON.stringify(errorData, null, 2));
            throw error;
        }
    }

    /**
     * Logout and delete instance
     */
    async logoutInstance(instanceName) {
        try {
            await this.client.delete(`/instance/logout/${instanceName}`);
            await this.client.delete(`/instance/delete/${instanceName}`);
            return { success: true };
        } catch (error) {
            console.error('Error logging out instance:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Create a WhatsApp Group
     */
    async createGroup(instanceName, subject, participants, description = '') {
        try {
            console.log('Backend: Creating Group:', { 
                subject, 
                participantsCount: participants?.length,
                participants: participants // Log the actual array
            });
            const response = await this.client.post(`/group/create/${instanceName}`, {
                subject,
                description,
                participants
            });
            console.log('Backend: Group Created Successfully:', JSON.stringify(response.data, null, 2));
            return response.data;
        } catch (error) {
            console.error('Error creating group:', error.response?.data || error.message);
            if (error.response?.data) {
                console.error('Detailed Error:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    /**
     * Fetch all groups for an instance
     */
    async fetchAllGroups(instanceName) {
        try {
            // Updated to include getParticipants=false as required by Evolution API v2
            const response = await this.client.get(`/group/fetchAllGroups/${instanceName}?getParticipants=false`);
            return response.data;
        } catch (error) {
            console.error('Error fetching groups:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Update participants in a group (add/remove)
     */
    async updateGroupParticipants(instanceName, groupJid, action, participants) {
        try {
            console.log(`Backend: Updating Participants [${action}] in ${groupJid}:`, { participantsCount: participants?.length });
            const response = await this.client.post(`/group/updateParticipant/${instanceName}?groupJid=${groupJid}`, {
                action,
                participants
            });
            console.log('Backend: Participants Updated Successfully:', JSON.stringify(response.data, null, 2));
            return response.data;
        } catch (error) {
            console.error('Error updating group participants:', error.response?.data || error.message);
            if (error.response?.data) {
                console.error('Detailed Error:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    /**
     * Get the invite code for a group
     */
    async getGroupInviteCode(instanceName, groupJid) {
        try {
            const response = await this.client.get(`/group/inviteCode/${instanceName}?groupJid=${groupJid}`);
            return response.data; // Usually { code: "ABC123XYZ" }
        } catch (error) {
            console.error('Error fetching group invite code:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Identifies skipped participants and sends them a private invite link
     */
    async autoInviteSkippedParticipants(instanceName, groupJid, groupSubject, requestedParticipants, joinedParticipantsJids) {
        try {
            // Conversion: Evolution API returns JIDs like "91999...@s.whatsapp.net"
            // joinedParticipantsJids might be strings or objects depending on the endpoint
            const joinedNumbers = joinedParticipantsJids.map(p => {
                const jid = typeof p === 'string' ? p : p.id || p.phoneNumber;
                return jid.split('@')[0];
            });

            // Find skipped numbers
            const skipped = requestedParticipants.filter(reqNum => !joinedNumbers.includes(reqNum));

            if (skipped.length === 0) return { skippedCount: 0 };

            console.log(`Backend: Auto-inviting ${skipped.length} skipped participants to ${groupSubject}`);

            // Fetch invite link
            const inviteData = await this.getGroupInviteCode(instanceName, groupJid);
            const inviteUrl = `https://chat.whatsapp.com/${inviteData.code}`;

            const template = `Hi! I tried to add you to the WhatsApp group "${groupSubject}", but your privacy settings blocked the addition. \n\nPlease join using this link instead: ${inviteUrl}`;

            // Send messages in parallel (with minor delay if needed, but axios handles it)
            const sendPromises = skipped.map(num => this.sendMessage(instanceName, num, template));
            await Promise.allSettled(sendPromises);

            return { skippedCount: skipped.length, inviteUrl };
        } catch (error) {
            console.error('Error in auto-invite automation:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Leave a WhatsApp group
     */
    async leaveGroup(instanceName, groupJid) {
        try {
            console.log(`Backend: Instance ${instanceName} leaving group ${groupJid}`);
            const response = await this.client.delete(`/group/leave/${instanceName}?groupJid=${groupJid}`);
            return response.data;
        } catch (error) {
            console.error('Error leaving group:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Check if numbers have WhatsApp
     * @param {string} instanceName 
     * @param {Array} numbers - Array of strings like "919876543210"
     */
    async checkWhatsApp(instanceName, numbers) {
        try {
            // Evolution API uses /chat/whatsappNumbers/{instance} for presence check
            const response = await this.client.post(`/chat/whatsappNumbers/${instanceName}`, {
                numbers: numbers
            });
            return response.data; // Usually an array of { exists: true/false, jid, number }
        } catch (error) {
            console.error('Error checking WhatsApp presence:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Request Registration Code (SMS)
     */
    async requestRegistrationCode(instanceName, phoneNumber) {
        try {
            const response = await this.client.post(`/instance/registerCode/${instanceName}`, {
                phoneNumber: phoneNumber,
                method: 'sms'
            });
            return response.data;
        } catch (error) {
            console.error('Error requesting registration code:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Register Number with Code
     */
    async registerNumber(instanceName, code) {
        try {
            const response = await this.client.post(`/instance/registerNumber/${instanceName}`, {
                registrationCode: code
            });
            return response.data;
        } catch (error) {
            console.error('Error registering number:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new EvolutionService();
