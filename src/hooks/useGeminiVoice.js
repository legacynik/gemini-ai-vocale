import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { TOOL_DEFINITIONS } from '../config/tools';

export function useGeminiVoice(apiKey, systemPrompt, selectedVoice, tools = []) {
    const [isRecording, setIsRecording] = useState(false);
    const [status, setStatus] = useState('Pronto');
    const [transcript, setTranscript] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [audioData, setAudioData] = useState(new Uint8Array(128));
    const [toolCalls, setToolCalls] = useState([]);

    const sessionRef = useRef(null);
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const streamRef = useRef(null);
    const playbackContextRef = useRef(null);
    const nextPlayTimeRef = useRef(0);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const isRecordingRef = useRef(false);

    // Initialize Gemini session
    useEffect(() => {
        if (!apiKey) return;

        let isActive = true;

        const initSession = async () => {
            try {
                const ai = new GoogleGenAI({ apiKey });

                // Initialize playback context once
                if (!playbackContextRef.current) {
                    playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                        sampleRate: 24000
                    });
                }

                const config = {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    }
                };

                // Add voice config if selected
                if (selectedVoice) {
                    config.speechConfig = {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: selectedVoice }
                        }
                    };
                }

                // Add tools if provided
                if (tools && tools.length > 0) {
                    config.tools = [{
                        functionDeclarations: tools.map(toolName => TOOL_DEFINITIONS[toolName]).filter(Boolean)
                    }];
                }

                const session = await ai.live.connect({
                    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                    config,
                    callbacks: {
                        onopen: () => {
                            if (isActive) console.log('WebSocket opened');
                        },
                        onmessage: (msg) => {
                            if (isActive) handleMessage(msg);
                        },
                        onerror: (e) => {
                            if (isActive) setStatus('Errore: ' + e.message);
                        },
                        onclose: () => {
                            if (isActive) {
                                setIsConnected(false);
                                setStatus('Disconnesso');
                            }
                        },
                        onToolCall: async (toolCall) => {
                            if (isActive) await handleToolCall(toolCall);
                        }
                    }
                });

                if (!isActive) {
                    session.close();
                    return;
                }

                sessionRef.current = session;
                setIsConnected(true);
                setStatus('Pronto! Clicca per parlare');

            } catch (error) {
                if (isActive) setStatus('Errore: ' + error.message);
            }
        };

        initSession();

        return () => {
            isActive = false;
            if (sessionRef.current) {
                sessionRef.current.close();
            }
        };
    }, [apiKey, systemPrompt, selectedVoice, tools]);

    const handleMessage = (message) => {
        if (message.setupComplete) {
            console.log('Setup completato');
            return;
        }

        if (message.data) {
            playAudioChunk(message.data);
        }

        if (message.text) {
            setTranscript(prev => prev + ' ' + message.text);
        }

        // Handle tool calls embedded in message if not using onToolCall callback
        // (Depends on SDK version, keeping this flexible)
        if (message.toolCall) {
            handleToolCall(message.toolCall);
        }

        if (message.serverContent?.turnComplete) {
            setStatus('Pronto! Clicca per parlare');
            nextPlayTimeRef.current = 0;
        }
    };

    const handleToolCall = async (toolCall) => {
        console.log('Tool Call received:', toolCall);
        const { functionCalls } = toolCall;
        if (!functionCalls) return;

        const responses = [];

        for (const call of functionCalls) {
            const { name, args, id } = call;

            // Log tool call
            const logEntry = {
                timestamp: new Date(),
                tool: name,
                params: args,
                result: null, // Will update later
                latency: 0
            };

            const startTime = Date.now();

            // Execute mock tool
            const result = await callSupabaseTool(name, args);

            const endTime = Date.now();
            logEntry.result = result;
            logEntry.latency = endTime - startTime;

            setToolCalls(prev => [logEntry, ...prev]);

            responses.push({
                name,
                response: { result },
                id
            });
        }

        // Send response back to Gemini
        if (sessionRef.current) {
            sessionRef.current.sendToolResponse({
                functionResponses: responses
            });
        }
    };

    const callSupabaseTool = async (toolName, args) => {
        // In a real app, this would fetch from Supabase Edge Function
        // const response = await fetch(`${SUPABASE_URL}/functions/v1/tool-proxy`, ...);

        // Mock delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

        // Mock responses based on tool name
        switch (toolName) {
            case 'check_calendar':
                return { available: true, slots: ['10:00', '14:00'] };
            case 'schedule_appointment':
                return { success: true, confirmationId: 'APT-' + Math.random().toString(36).substr(2, 6).toUpperCase() };
            case 'create_client_profile':
                return { success: true, profileId: 'CLI-' + Math.random().toString(36).substr(2, 6).toUpperCase() };
            default:
                return { success: true, message: 'Action completed successfully' };
        }
    };

    const playAudioChunk = async (base64Data) => {
        try {
            if (playbackContextRef.current.state === 'suspended') {
                await playbackContextRef.current.resume();
            }

            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const pcm16 = new Int16Array(bytes.buffer);
            const audioBuffer = playbackContextRef.current.createBuffer(1, pcm16.length, 24000);
            const channelData = audioBuffer.getChannelData(0);

            for (let i = 0; i < pcm16.length; i++) {
                channelData[i] = pcm16[i] / 32768.0;
            }

            const source = playbackContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(playbackContextRef.current.destination);

            const currentTime = playbackContextRef.current.currentTime;
            const startTime = Math.max(currentTime, nextPlayTimeRef.current);
            source.start(startTime);

            nextPlayTimeRef.current = startTime + audioBuffer.duration;
            setStatus('Gemini sta parlando...');

        } catch (error) {
            console.error('Errore audio:', error);
            setStatus('Errore riproduzione audio');
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, channelCount: 1 }
            });

            const audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioContext.destination);

            processor.onaudioprocess = (e) => {
                if (!isRecordingRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                }

                const bytes = new Uint8Array(pcmData.buffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);

                if (sessionRef.current) {
                    sessionRef.current.sendRealtimeInput({
                        audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                    });
                }
            };

            audioContextRef.current = audioContext;
            processorRef.current = processor;
            streamRef.current = stream;
            analyserRef.current = analyser;

            isRecordingRef.current = true;
            setIsRecording(true);
            setStatus('Ti ascolto...');
            setTranscript('');
            visualizeAudio();

        } catch (error) {
            setStatus('Errore microfono: ' + error.message);
        }
    };

    const stopRecording = () => {
        isRecordingRef.current = false;
        setIsRecording(false);

        if (processorRef.current) processorRef.current.disconnect();
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) audioContextRef.current.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        if (sessionRef.current) {
            sessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
        }

        setStatus('Elaborazione...');
    };

    const visualizeAudio = () => {
        if (!analyserRef.current || !isRecordingRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        setAudioData(dataArray);

        animationFrameRef.current = requestAnimationFrame(visualizeAudio);
    };

    const toggleRecording = () => {
        if (isRecordingRef.current) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return {
        isRecording,
        status,
        transcript,
        isConnected,
        audioData,
        toggleRecording,
        toolCalls
    };
}
