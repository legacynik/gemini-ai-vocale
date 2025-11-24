const recordButton = document.getElementById('recordButton');
const statusElement = document.getElementById('status');
const visualizerCanvas = document.getElementById('visualizer');
const latencyElement = document.getElementById('latency');

let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let ws;
let audioContext;
let analyser;
let silenceStart = Date.now();
let silenceThreshold = 0.02; // Sensitivity
let silenceDuration = 1500; // 1.5 seconds of silence to trigger
let isSpeaking = false; // AI is speaking
let animationId;

// Initialize WebSocket
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        console.log('Connected to server');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'status') {
            statusElement.textContent = data.message;
        } else if (data.type === 'response') {
            statusElement.textContent = 'Risposta ricevuta';
            const responseText = document.getElementById('response-text');
            responseText.textContent = data.text;

            // Play audio (TTS)
            speakText(data.text);
        } else if (data.type === 'error') {
            statusElement.textContent = 'Errore: ' + data.message;
            statusElement.style.color = 'red';
            console.error('Server Error:', data.message);
            // Retry listening if error occurs?
            setTimeout(startRecording, 2000);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        statusElement.textContent = 'Errore di connessione WebSocket';
        statusElement.style.color = 'red';
    };

    ws.onclose = () => {
        console.log('Disconnected');
        statusElement.textContent = 'Disconnesso dal server';
    };
}

connectWebSocket();

recordButton.addEventListener('click', toggleRecording);

async function toggleRecording() {
    if (!isRecording) {
        // User starts the conversation loop
        startRecording();
    } else {
        // User manually stops everything
        stopRecording(false); // false = don't restart
    }
}

async function startRecording() {
    if (isSpeaking) return; // Don't record while AI speaks

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Audio Context for VAD
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(event.data);
                }
            }
        };

        mediaRecorder.onstop = () => {
            console.log('Recorder stopped');
            // Send end of stream signal AFTER the last chunk (which is sent in ondataavailable)
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'END_OF_AUDIO' }));
            }
        };

        mediaRecorder.start(100);
        isRecording = true;
        recordButton.classList.add('recording');
        recordButton.querySelector('.text').textContent = 'Stop';
        statusElement.textContent = 'Ti ascolto...';
        statusElement.style.color = '#ea4335';

        detectSilence();

    } catch (err) {
        console.error('Error accessing microphone:', err);
        statusElement.textContent = 'Errore microfono';
    }
}

function stopRecording(shouldRestart = true) {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop(); // This triggers onstop
        isRecording = false;
        recordButton.classList.remove('recording');
        recordButton.querySelector('.text').textContent = 'Parla';
        statusElement.textContent = 'Elaborazione...';
        statusElement.style.color = '#5f6368';

        // Don't stop tracks immediately, let the recorder finish
        // mediaRecorder.stream.getTracks().forEach(track => track.stop());
        cancelAnimationFrame(animationId);

        // The restart logic is handled in speakText.onend
    }
}

function detectSilence() {
    if (!isRecording) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
    }
    const average = sum / bufferLength / 255;

    // Visualizer logic (simple bar)
    const ctx = visualizerCanvas.getContext('2d');
    visualizerCanvas.width = visualizerCanvas.offsetWidth;
    visualizerCanvas.height = visualizerCanvas.offsetHeight;
    ctx.fillStyle = '#4285f4';
    ctx.fillRect(0, 0, visualizerCanvas.width * average * 2, visualizerCanvas.height);

    if (average < silenceThreshold) {
        if (Date.now() - silenceStart > silenceDuration) {
            // Silence detected for long enough
            console.log('Silence detected, stopping recording...');
            stopRecording(true); // Stop and prepare to restart after TTS
            return;
        }
    } else {
        silenceStart = Date.now(); // Reset timer if sound detected
    }

    animationId = requestAnimationFrame(detectSilence);
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Select best Italian voice
        const voices = window.speechSynthesis.getVoices();
        const italianVoice = voices.find(v => v.lang.includes('it') && (v.name.includes('Google') || v.name.includes('Premium'))) ||
            voices.find(v => v.lang.includes('it'));

        if (italianVoice) {
            utterance.voice = italianVoice;
            console.log('Using voice:', italianVoice.name);
        }

        utterance.lang = 'it-IT';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            isSpeaking = true;
            statusElement.textContent = 'Parlando...';
            statusElement.style.color = '#4285f4';
        };

        utterance.onend = () => {
            isSpeaking = false;
            statusElement.textContent = 'In attesa...';
            // Auto-restart recording for continuous conversation
            setTimeout(startRecording, 500);
        };

        window.speechSynthesis.speak(utterance);
    } else {
        console.warn('TTS not supported');
    }
}

// Load voices immediately
window.speechSynthesis.getVoices();
window.speechSynthesis.onvoiceschanged = () => {
    console.log('Voices loaded');
};
