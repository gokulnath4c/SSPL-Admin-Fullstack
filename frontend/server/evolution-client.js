import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const { EVOLUTION_API_URL, EVOLUTION_API_KEY } = process.env;

export const evolutionClient = {
    async request(path, method = 'GET', body = null) {
        const url = `${EVOLUTION_API_URL}${path}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        console.log(`[EvolutionClient] ${method} ${url}`);
        let response;
        try {
            response = await fetch(url, options);
        } catch (err) {
            console.error(`[EvolutionClient] Network error: ${err.message}`);
            const error = new Error(`Evolution API is unreachable (${err.code || 'OFFLINE'})`);
            error.status = 503;
            error.code = err.code;
            throw error;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Evolution API Error] ${response.status}: ${errorText}`);
            
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { message: errorText };
            }

            // Create a custom error object that includes the status and response data
            const error = new Error(`Evolution API Error (${response.status})`);
            error.status = response.status;
            error.data = errorData;
            throw error;
        }
        return response.json();
    },

    async fetchInstances() {
        return this.request('/instance/fetchInstances');
    },

    async getInstanceStatus(instanceName) {
        return this.request(`/instance/connectionState/${instanceName}`);
    },

    async getQR(instanceName) {
        return this.request(`/instance/connect/${instanceName}`);
    },

    async createInstance(instanceName) {
        try {
            return await this.request('/instance/create', 'POST', {
                instanceName,
                token: EVOLUTION_API_KEY,
                number: '',
                qrcode: true
            });
        } catch (err) {
            // Handle the "already in use" case gracefully
            const errorMsg = err.data?.response?.message?.[0] || err.data?.message || '';
            if (err.status === 403 && errorMsg.includes('already in use')) {
                console.log(`[EvolutionClient] Instance "${instanceName}" already exists. Reusing existing instance.`);
                // Return a structure that satisfies the caller
                return { 
                    instance: { 
                        instanceName, 
                        status: 'created', // Evolution API returns this typically
                        reused: true 
                    } 
                };
            }
            throw err;
        }
    },

    async deleteInstance(instanceName) {
        return this.request(`/instance/logout/${instanceName}`, 'DELETE');
    },

    async sendText(instanceName, number, text, delay = 0) {
        return this.request(`/message/sendText/${instanceName}`, 'POST', {
            number,
            text,
            linkPreview: false,
            delay: delay
        });
    },

    async sendButtons(instanceName, number, title, description, footer, buttons) {
        return this.request(`/message/sendButtons/${instanceName}`, 'POST', {
            number,
            title,
            description,
            footer,
            buttons: buttons.map(b => ({
                type: b.type, // 'reply' or 'url'
                displayText: b.text,
                ...(b.type === 'reply' ? { id: b.id } : { url: b.url })
            }))
        });
    },

    async getGroups(instanceName) {
        return this.request(`/group/fetchAllGroups/${instanceName}?getParticipants=false`);
    },

    async createGroup(instanceName, subject, participants) {
        return this.request(`/group/create/${instanceName}`, 'POST', {
            subject,
            participants
        });
    },

    async addParticipants(instanceName, groupJid, participants, smartJoin = false) {
        // Step 1: Attempt standard add
        const addResult = await this.request(`/group/updateParticipant/${instanceName}?groupJid=${groupJid}`, 'POST', {
            action: 'add',
            participants
        });

        const results = {
            total: participants.length,
            added: 0,
            invited: 0,
            failed: 0,
            details: []
        };

        if (addResult && Array.isArray(addResult)) {
            let inviteCode = null;
            for (const p of addResult) {
                // Status 200 or '200' means success
                if (p.status === 200 || p.status === '200') {
                    results.added++;
                } 
                // Status 403 usually means privacy settings blocked the add
                else if (smartJoin && (p.status === 403 || p.status === '403')) {
                    try {
                        if (!inviteCode) {
                            const inviteData = await this.getInviteCode(instanceName, groupJid);
                            inviteCode = inviteData.inviteCode || inviteData.code;
                        }
                        if (inviteCode) {
                            const inviteUrl = `https://chat.whatsapp.com/${inviteCode}`;
                            await this.sendText(instanceName, p.jid, `Hi! I tried to add you to our group, but your privacy settings blocked it. Here is the link to join: ${inviteUrl}`);
                            results.invited++;
                        } else {
                            results.failed++;
                        }
                    } catch (err) {
                        console.error(`[SmartJoin Error] ${err.message}`);
                        results.failed++;
                    }
                } else {
                    results.failed++;
                }
                results.details.push(p);
            }
        }

        return results;
    },

    async leaveGroup(instanceName, groupJid) {
        return this.request(`/group/leaveGroup/${instanceName}?groupJid=${groupJid}`, 'DELETE');
    },

    async getInviteCode(instanceName, groupJid) {
        return this.request(`/group/inviteCode/${instanceName}?groupJid=${groupJid}`);
    }
};
