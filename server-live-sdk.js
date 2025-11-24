require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { GoogleGenAI, Modality } = require('@google/genai');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash-exp";

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket connection handling
wss.on('connection', (clientWs) => {
    console.log('Client connected');

    let geminiSession = null;
    let isSessionActive = false;

    // Connect to Gemini Live API using SDK
    async function connectToGemini() {
        try {
            const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

            const config = {
                responseModalities: [Modality.AUDIO],
                systemInstruction: {
                    parts: [{
                        text: "Sei un assistente vocale italiano. Rispondi sempre in italiano in modo naturale e cordiale. Mantieni le risposte concise."
                    }]
                }
            };

            geminiSession = await ai.live.connect({
                model: MODEL_NAME,
                config: config,
                callbacks: {
                    onopen: function () {
                        console.log('WebSocket opened to Gemini');
                    },
                    onmessage: function (message) {
                        console.log('Gemini message:', JSON.stringify(message).substring(0, 200));

                        // Handle setup complete
                        if (message.setupComplete) {
                            console.log('Setup complete - session ready');
                            isSessionActive = true;
                            clientWs.send(JSON.stringify({ type: 'ready' }));
                            return;
                        }

                        // Handle audio data
                        if (message.data) {
                            clientWs.send(JSON.stringify({
                                type: 'audio',
                                data: message.data
                            }));
                        }

                        // Handle text
                        if (message.text) {
                            clientWs.send(JSON.stringify({
                                type: 'text',
                                text: message.text
                            }));
                        }

                        // Handle turn complete
                        if (message.serverContent && message.serverContent.turnComplete) {
                            console.log('Turn complete');
                            clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                        }
                    },
                    onerror: function (error) {
                        console.error('Gemini error:', error);
                        clientWs.send(JSON.stringify({
                            type: 'error',
                            message: error.message
                        }));
                    },
                    onclose: function (event) {
                        console.log('Gemini session closed:', event.reason);
                        isSessionActive = false;
                    }
                }
            });

        } catch (error) {
            console.error('Error connecting to Gemini:', error);
            clientWs.send(JSON.stringify({
                type: 'error',
                message: 'Failed to connect: ' + error.message
            }));
        }
    }

    // Handle messages from client
    clientWs.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'start') {
                await connectToGemini();
            } else if (data.type === 'audio_chunk') {
                // Send audio to Gemini using SDK
                if (geminiSession && isSessionActive) {
                    geminiSession.sendRealtimeInput({
                        audio: {
                            data: data.audio,
                            mimeType: "audio/pcm;rate=16000"
                        }
                    });
                }
            } else if (data.type === 'end_turn') {
                // Send audio stream end
                if (geminiSession && isSessionActive) {
                    geminiSession.sendRealtimeInput({ audioStreamEnd: true });
                }
            }
        } catch (error) {
            console.error('Error handling client message:', error);
        }
    });

    clientWs.on('close', () => {
        console.log('Client disconnected');
        if (geminiSession) {
            geminiSession.close();
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Using model: ${MODEL_NAME}`);
});
