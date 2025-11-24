require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).apiKey; // Hack to get client? No, use listModels on the manager if available, or just try to list via API if SDK supports it. 
        // The SDK doesn't have a direct listModels on the client instance in some versions, but let's try the standard way if possible or use a fetch.
        // Actually, let's use a direct fetch to be sure.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name.replace('models/', '')}`);
                }
            });
        } else {
            console.log("No models found or error:", data);
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
