import { motion } from 'framer-motion';
import './ControlButton.css';

const ControlButton = ({ isRecording, isConnected, onClick }) => {
    return (
        <motion.button
            className={`control-button ${isRecording ? 'recording' : ''} ${!isConnected ? 'disabled' : ''}`}
            onClick={onClick}
            disabled={!isConnected}
            whileHover={{ scale: isConnected ? 1.1 : 1 }}
            whileTap={{ scale: isConnected ? 0.95 : 1 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="button-icon">
                {isRecording ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="6" y="6" width="12" height="12" rx="2" fill="#ff4444" />
                    </svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="var(--cyan-primary)" />
                        <path d="M19 10V11C19 14.87 15.87 18 12 18C8.13 18 5 14.87 5 11V10" stroke="var(--cyan-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 18V22" stroke="var(--cyan-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>
        </motion.button>
    );
};

export default ControlButton;
