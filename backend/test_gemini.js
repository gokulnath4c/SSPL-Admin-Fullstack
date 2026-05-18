const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.production') });
const { GoogleGenerativeAI } = require("@google/generative-ai");

console.log("Checking Environment...");
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY is missing from process.env");
    console.log("Current env vars:", Object.keys(process.env));
    process.exit(1);
} else {
    console.log("✅ GEMINI_API_KEY found (starts with: " + apiKey.substring(0, 5) + "...)");
}

async function testGemini() {
    try {
        console.log("Initializing Gemini Client...");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        console.log("Sending test prompt...");
        const result = await model.generateContent("Hello");
        const response = await result.response;
        const text = response.text();

        console.log("✅ SUCCESS! Gemini Response:");
        console.log(text);
    } catch (error) {
        console.error("❌ ERROR connecting to Gemini:");
        console.error("Status:", error.status);
        console.error("StatusText:", error.statusText);
        console.error("ErrorDetails:", JSON.stringify(error.errorDetails, null, 2));
        console.error("Full Error:", error);
    }
}

testGemini();
