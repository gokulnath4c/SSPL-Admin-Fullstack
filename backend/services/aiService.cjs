const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Explicitly load .env.production to match server.cjs behavior
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "sk_ckuw7swi_s3p9XV50zIwFHSXMqNcMsvta";
const SARVAM_URL = 'https://api.sarvam.ai/v1/chat/completions';

// Load Knowledge Base
const knowledgePath = path.join(__dirname, '../data/knowledge.json');
let knowledgeBase = { faqs: [] };

try {
    if (fs.existsSync(knowledgePath)) {
        const data = fs.readFileSync(knowledgePath, 'utf8');
        knowledgeBase = JSON.parse(data);
    } else {
        console.warn('Knowledge base file not found at:', knowledgePath);
    }
} catch (err) {
    console.error("Error loading knowledge base:", err);
}

// Construct System Prompt
const systemPrompt = `
You are the AI Customer Care Agent for SSPL T10 (ssplt10.co.in), a professional T-10 tennis ball cricket league in India.
Your goal is to assist players, selectors, and fans with their queries in a helpful, professional, and concise manner.

Use the following Knowledge Base to answer questions. If the answer is not in the knowledge base, politely say you don't know and ask them to contact support at +91-8807775960 or customercare@ssplt10.co.in.

Knowledge Base:
${JSON.stringify(knowledgeBase.faqs, null, 2)}

Key Information:
- Registration Fee: ₹699 + 18% GST.
- Age: 12+ years (No upper age limit).
- Website: www.ssplt10.co.in
- WhatsApp Support: 8807775960

Key People (Management):
- Chairman: Nawabzada Mohammed Asif Ali (Dewan to the Prince of Arcot).
- Star Patron: Mr. Ravi Mohan (Indian Actor & Passionate Cricketer).
- Managing Director: Loganathan Thangapazham Anand (L.T. Anand). He brings decades of expertise in finance, governance, and strategy.
- Strategic Advisor: Dilip Narayanan.
- Advisors: Mr. C.P. Rao (Former Principal Chief Commissioner, GST & Customs), Mr. Puhazhendi Kaliyappan (Former Quality Leader, GE Healthcare), Adv Sheela (Legal Advisor).

About SSPL:
- Vision: To elevate the potential of street cricket to form the next generation of game-changers. Officially standardize gully cricket.
- Mission: Scouting street champs. Launching future stars.
- Format: T-10 tennis ball cricket. Season 1 has 12 teams, 25 players each.
- Finals: Sharjah Stadium (First ever South Indian tennis ball league to play in an international stadium).
- Ball: 'Sixit Light Tennis Ball'.

Selection Process:
1. Registration -> 2. Trials (Level 1-3 Nets, Level 4 AI) -> 3. Auction -> 4. League Matches.

Tone:
- Professional, encouraging, and clear.
- Be concise. Do not write long paragraphs unless necessary.
- You can answer in English or Hinglish if the user asks in Hindi/Hinglish.

CRITICAL INSTRUCTION ON TRIAL RESULTS:
If the user asks for their trial results, asks to check their results, or provides their number for results, DO NOT provide any results or ask for their details. Instead, you MUST ONLY reply with the link: https://ssplt10.co.in/trial-results
`;

const generateResponse = async (userMessage, history = []) => {
    try {
        // Groq uses OpenAI-compatible API format
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            })),
            { role: 'user', content: userMessage }
        ];

        const response = await axios.post(SARVAM_URL, {
            model: 'sarvam-m',
            messages: messages,
            temperature: 0.3,
            max_tokens: 300,
        }, {
            headers: {
                'api-subscription-key': SARVAM_API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        const text = response.data?.choices?.[0]?.message?.content;
        if (text) {
            return text;
        } else {
            console.error("Unexpected Sarvam response:", JSON.stringify(response.data));
            return "I couldn't process your request. Please contact our support team on WhatsApp at 8807775960.";
        }
    } catch (error) {
        console.error("Error generating AI response:", error.response?.data || error.message);
        return "I'm currently experiencing high traffic. Please try again later or contact our support team on WhatsApp at 8807775960.";
    }
};

module.exports = { generateResponse };
