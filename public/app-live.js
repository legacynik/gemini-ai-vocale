const recordButton = document.getElementById('recordButton');
const statusElement = document.getElementById('status');
const visualizerCanvas = document.getElementById('visualizer');
const responseTextElement = document.getElementById('response-text');

let isRecording = false;
let mediaRecorder;
let ws;
let audioContext;
let analyser;
let animationId;
let isSpeaking = false;
let isReady = false;
let audioQueue = [];
let currentSource = null;

// Initialize WebSocket
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        console.log('Connected to server');
        updateStatus('Connessione in corso...', '#fbbc04');
        ws.send(JSON.stringify({ type: 'start' }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Message:', data.type);

        if (data.type === 'ready') {
            isReady = true;
            updateStatus('Pronto! Clicca "Parla" per iniziare', '#34a853');
            recordButton.disabled = false;
        } else if (data.type === 'audio') {
            console.log('Received audio chunk');
            playAudio(data.data, data.mimeType);
        } else if (data.type === 'text') {
            responseTextElement.textContent = data.text;
        } else if (data.type === 'turn_complete') {
            console.log('Turn complete - ready for next input');
            isSpeaking = false;
            updateStatus('Pronto - Clicca per parlare di nuovo', '#34a853');
        } else if (data.type === 'error') {
            updateStatus('Errore: ' + data.message, '#ea4335');
            console.error(data.message);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        updateStatus('Errore di connessione', '#ea4335');
    };

    ws.onclose = () => {
        updateStatus('Disconnesso - Ricarica la pagina', '#ea4335');
        recordButton.disabled = true;
    };
}

function updateStatus(text, color) {
    statusElement.textContent = text;
    statusElement.style.color = color;
}

connectWebSocket();

recordButton.addEventListener('click', toggleRecording);
recordButton.disabled = true;

async function toggleRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    if (!isReady || isSpeaking) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Audio Context for visualization
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        // Create processor to get raw PCM data
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
            if (!isRecording) return;

            const inputData = e.inputBuffer.getChannelData(0);
            // Convert Float32 to Int16 PCM
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }

            // Convert to base64 and send
            const base64 = arrayBufferToBase64(pcmData.buffer);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'audio_chunk',
                    audio: base64
                }));
            }
        };

        isRecording = true;
        recordButton.classList.add('recording');
        recordButton.querySelector('.text').textContent = 'Stop';
        updateStatus('Ti ascolto... Parla ora!', '#ea4335');
        responseTextElement.textContent = '';

        visualize();

        // Store for cleanup
        window.audioProcessor = processor;
        window.audioStream = stream;

    } catch (err) {
        console.error('Error accessing microphone:', err);
        updateStatus('Errore microfono: ' + err.message, '#ea4335');
    }
}

function stopRecording() {
    if (!isRecording) return;

    isRecording = false;
    recordButton.classList.remove('recording');
    recordButton.querySelector('.text').textContent = 'Parla';
    updateStatus('Elaborazione...', '#fbbc04');

    // Cleanup
    if (window.audioProcessor) {
        window.audioProcessor.disconnect();
    }
    if (window.audioStream) {
        window.audioStream.getTracks().forEach(track => track.stop());
    }
    if (audioContext) {
        audioContext.close();
    }
    cancelAnimationFrame(animationId);

    // Signal end of turn
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'end_turn' }));
    }
}

function visualize() {
    if (!isRecording) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
    }
    const average = sum / bufferLength / 255;

    const ctx = visualizerCanvas.getContext('2d');
    visualizerCanvas.width = visualizerCanvas.offsetWidth;
    visualizerCanvas.height = visualizerCanvas.offsetHeight;

    // Clear
    ctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

    // Draw bars
    const barWidth = visualizerCanvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * visualizerCanvas.height;
        ctx.fillStyle = `rgb(66, 133, 244)`;
        ctx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);
        x += barWidth;
    }

    animationId = requestAnimationFrame(visualize);
}

async function playAudio(base64Data, mimeType) {
    isSpeaking = true;
    updateStatus('Gemini sta parlando...', '#4285f4');

    try {
        // Decode base64
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Create audio context if needed
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

        // Convert PCM16 to Float32
        const pcm16 = new Int16Array(bytes.buffer);
        const audioBuffer = audioCtx.createBuffer(1, pcm16.length, 24000);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < pcm16.length; i++) {
            channelData[i] = pcm16[i] / 32768.0;
        }

        // Play
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        source.onended = () => {
            console.log('Audio playback ended');
        };

        source.start(0);
        currentSource = source;

    } catch (error) {
        console.error('Error playing audio:', error);
        isSpeaking = false;
    }
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
