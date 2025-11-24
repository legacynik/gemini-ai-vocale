require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "models/gemini-2.0-flash-exp"; // Proven working model with Live API

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket connection handling
wss.on('connection', (clientWs) => {
    console.log('Client connected');

    let geminiWs = null;
    let sessionActive = false;

    // Connect to Gemini Live API
    function connectToGemini() {
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;
        geminiWs = new WebSocket(wsUrl);

        geminiWs.on('open', () => {
            console.log('Connected to Gemini Live API');

            // Send setup message (FIRST MESSAGE ONLY)
            const setupMessage = {
                setup: {
                    model: MODEL_NAME,
                    generation_config: {
                        response_modalities: ["AUDIO"]
                    },
                    system_instruction: {
                        parts: [{
                            text: "You are a helpful assistant and answer in a friendly tone in Italian."
                        }]
                    }
                }
            };

            console.log('Sending setup:', JSON.stringify(setupMessage));
            geminiWs.send(JSON.stringify(setupMessage));
        });

        geminiWs.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('Gemini message:', JSON.stringify(message).substring(0, 200));

                // Handle setup complete
                if (message.setupComplete) {
                    console.log('Setup complete');
                    sessionActive = true;
                    clientWs.send(JSON.stringify({ type: 'ready' }));
                    return;
                }

                // Handle server content (responses)
                if (message.serverContent) {
                    const content = message.serverContent;

                    // Model turn with parts
                    if (content.modelTurn && content.modelTurn.parts) {
                        content.modelTurn.parts.forEach(part => {
                            // Audio response
                            if (part.inlineData && part.inlineData.mimeType.includes('audio')) {
                                clientWs.send(JSON.stringify({
                                    type: 'audio',
                                    data: part.inlineData.data,
                                    mimeType: part.inlineData.mimeType
                                }));
                            }
                            // Text response
                            if (part.text) {
                                clientWs.send(JSON.stringify({
                                    type: 'text',
                                    text: part.text
                                }));
                            }
                        });
                    }

                    // Turn complete
                    if (content.turnComplete) {
                        console.log('Turn complete');
                        clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                    }
                }

            } catch (error) {
                console.error('Error parsing Gemini message:', error);
            }
        });

        geminiWs.on('error', (error) => {
            console.error('Gemini WebSocket error:', error);
            clientWs.send(JSON.stringify({
                type: 'error',
                message: 'Gemini error: ' + error.message
            }));
        });

        geminiWs.on('close', (code, reason) => {
            console.log('Gemini WebSocket closed:', code, reason.toString());
            sessionActive = false;
        });
    }

    // Handle messages from client
    clientWs.on('message', (message) => {
        try {
            // Check if JSON control message
            const msgStr = message.toString();
            if (msgStr.startsWith('{')) {
                const data = JSON.parse(msgStr);

                if (data.type === 'start') {
                    connectToGemini();
                } else if (data.type === 'audio_chunk') {
                    // Client sending audio as base64
                    if (geminiWs && sessionActive && geminiWs.readyState === WebSocket.OPEN) {
                        const audioMessage = {
                            realtime_input: {
                                media_chunks: [{
                                    mime_type: "audio/pcm",
                                    data: data.audio
                                }]
                            }
                        };
                        geminiWs.send(JSON.stringify(audioMessage));
                    }
                } else if (data.type === 'end_turn') {
                    // Signal turn complete
                    if (geminiWs && sessionActive && geminiWs.readyState === WebSocket.OPEN) {
                        const turnMessage = {
                            client_content: {
                                turns: [{
                                    role: "user",
                                    parts: []
                                }],
                                turn_complete: true
                            }
                        };
                        console.log('Sending turn complete');
                        geminiWs.send(JSON.stringify(turnMessage));
                    }
                }
            }
        } catch (error) {
            console.error('Error handling client message:', error);
        }
    });

    clientWs.on('close', () => {
        console.log('Client disconnected');
        if (geminiWs) {
            geminiWs.close();
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Using model: ${MODEL_NAME}`);
});
