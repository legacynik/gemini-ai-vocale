import { motion } from 'framer-motion';
import './VoiceSelector.css';

const VOICES = [
    { id: 'Puck', name: 'Puck' },
    { id: 'Charon', name: 'Charon' },
    { id: 'Kore', name: 'Kore' },
    { id: 'Fenrir', name: 'Fenrir' },
    { id: 'Aoede', name: 'Aoede' },
    { id: 'Jupiter', name: 'Jupiter' }
];

const VoiceSelector = ({ selectedVoice, onVoiceChange }) => {
    return (
        <motion.div
            className="voice-selector"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        >
            <div className="voice-label">VOICE SELECT</div>
            <div className="voice-options">
                {VOICES.map((voice) => (
                    <motion.button
                        key={voice.id}
                        className={`voice-option ${selectedVoice === voice.id ? 'active' : ''}`}
                        onClick={() => onVoiceChange(voice.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {voice.name}
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
};

export default VoiceSelector;
