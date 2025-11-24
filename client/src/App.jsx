import { useState } from 'react';
import { useGeminiVoice } from './hooks/useGeminiVoice';
import DotPattern from './components/DotPattern';
import TopBar from './components/TopBar';
import CircularVisualizer from './components/CircularVisualizer';
import VoiceSelector from './components/VoiceSelector';
import ControlButton from './components/ControlButton';
import './styles/globals.css';
import './App.css';

function App() {
    const [apiKey, setApiKey] = useState(
        import.meta.env.VITE_GEMINI_API_KEY ||
        localStorage.getItem('gemini_api_key') ||
        ''
    );
    const [systemPrompt, setSystemPrompt] = useState(
        localStorage.getItem('system_prompt') ||
        'You are a helpful AI assistant. Be concise and friendly.'
    );
    const [selectedVoice, setSelectedVoice] = useState('Puck');
    const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);

    const {
        isRecording,
        status,
        transcript,
        isConnected,
        audioData,
        toggleRecording
    } = useGeminiVoice(apiKey, systemPrompt, selectedVoice);

    const handleApiKeySubmit = (e) => {
        e.preventDefault();
        const input = e.target.elements.apiKey.value;
        if (input) {
            setApiKey(input);
            localStorage.setItem('gemini_api_key', input);
            setShowApiKeyInput(false);
        }
    };

    const handleSystemPromptChange = (newPrompt) => {
        setSystemPrompt(newPrompt);
        localStorage.setItem('system_prompt', newPrompt);
    };

    const handleVoiceChange = (voice) => {
        setSelectedVoice(voice);
    };

    if (showApiKeyInput) {
        return (
            <div className="api-key-screen">
                <DotPattern />
                <div className="api-key-container">
                    <h1 className="glow-text">GEMINI VOICE AI</h1>
                    <p className="api-key-subtitle">Enter your Gemini API Key to begin</p>
                    <form onSubmit={handleApiKeySubmit} className="api-key-form">
                        <input
                            type="password"
                            name="apiKey"
                            placeholder="Enter API Key..."
                            className="api-key-input"
                            autoFocus
                        />
                        <button type="submit" className="api-key-submit">
                            CONNECT
                        </button>
                    </form>
                    <button
                        className="api-key-skip"
                        onClick={() => setShowApiKeyInput(false)}
                    >
                        Skip (use environment variable)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <DotPattern />
            <TopBar
                isConnected={isConnected}
                systemPrompt={systemPrompt}
                onSystemPromptChange={handleSystemPromptChange}
            />

            <div className="main-container">
                <div className="visualizer-container">
                    <CircularVisualizer
                        audioData={audioData}
                        isRecording={isRecording}
                        isSpeaking={status.includes('parlando')}
                    />
                    <div className="control-container">
                        <ControlButton
                            isRecording={isRecording}
                            isConnected={isConnected}
                            onClick={toggleRecording}
                        />
                    </div>
                </div>
            </div>

            <VoiceSelector
                selectedVoice={selectedVoice}
                onVoiceChange={handleVoiceChange}
            />
            <div className="status-bar">
                {status}
            </div>
        </div>
    );
}

export default App;
