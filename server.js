require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Gemini API Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-2.5-flash"; // Updated as requested

const SYSTEM_PROMPT = `Sei un assistente vocale italiano professionale.
Rispondi sempre in italiano fluente e naturale.
Usa un tono cordiale ma professionale.
Esprimi emozioni appropriate al contesto.
Mantieni risposte concise (max 30 secondi di audio).`;

// WebSocket Connection Handling
wss.on('connection', (ws) => {
    console.log('Client connected');
    let audioChunks = [];

    ws.on('message', async (message) => {
        try {
            // Check if message is a JSON string (control message)
            if (message.toString().startsWith('{')) {
                const data = JSON.parse(message);
                if (data.type === 'END_OF_AUDIO') {
                    console.log('Processing audio...');
                    // Process the accumulated audio
                    await processAudio(ws, Buffer.concat(audioChunks));
                    audioChunks = []; // Reset chunks
                }
            } else {
                // Assume binary audio data
                audioChunks.push(message);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Error processing audio: ' + error.message }));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

async function processAudio(ws, audioBuffer) {
    const startTime = Date.now();
    try {
        ws.send(JSON.stringify({ type: 'status', message: 'Elaborazione con Gemini...' }));

        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: SYSTEM_PROMPT
        });

        // Convert buffer to base64
        const audioBase64 = audioBuffer.toString('base64');
        console.log(`Audio size: ${audioBase64.length} bytes`);

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "audio/webm", // Assuming webm from MediaRecorder
                    data: audioBase64
                }
            },
            { text: "Rispondi a questo audio." }
        ]);

        const response = await result.response;
        const text = response.text();
        console.log('Gemini Response:', text);

        // Calculate tokens (estimated)
        const inputTokens = audioBase64.length / 1000; // Rough estimate
        const outputTokens = text.length / 4;

        // Send text response back
        ws.send(JSON.stringify({
            type: 'response',
            text: text,
            audio: null // TODO: Implement TTS if Gemini doesn't return audio directly yet
        }));

        // Log to n8n
        const duration = Date.now() - startTime;
        logToN8n({
            timestamp: new Date().toISOString(),
            durationMs: duration,
            inputTokens: Math.round(inputTokens),
            outputTokens: Math.round(outputTokens),
            model: MODEL_NAME
        });

    } catch (error) {
        console.error('Gemini API Error Full:', error);
        let errorMessage = 'Errore durante la generazione';
        if (error.message) errorMessage += ': ' + error.message;
        ws.send(JSON.stringify({ type: 'error', message: errorMessage }));
    }
}

// n8n Webhook Integration
async function logToN8n(data) {
    if (!process.env.N8N_WEBHOOK_URL) return;
    try {
        await fetch(process.env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        console.log('Logged to n8n');
    } catch (error) {
        console.error('Error logging to n8n:', error);
    }
}

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
