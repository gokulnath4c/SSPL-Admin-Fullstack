import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Load Knowledge Base
const knowledgePath = path.join(__dirname, '../data/knowledge.json');
let knowledgeBase = { faqs: [] };

try {
    const data = fs.readFileSync(knowledgePath, 'utf8');
    knowledgeBase = JSON.parse(data);
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
- Age: 12+ years.
- Website: www.ssplt10.co.in
- WhatsApp Support: 8807775960

Tone:
- Professional, encouraging, and clear.
- Be concise. Do not write long paragraphs unless necessary.
- You can answer in English or Hinglish if the user asks in Hindi/Hinglish.
`;

export const generateResponse = async (userMessage, history = []) => {
    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: userMessage }
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Or "gpt-3.5-turbo" if cost is a concern
            messages: messages,
            temperature: 0.3, // Low temperature for more factual answers
            max_tokens: 300,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Error generating AI response:", error);
        return "I'm currently experiencing high traffic. Please try again later or contact our support team on WhatsApp.";
    }
};
