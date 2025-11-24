import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './TopBar.css';

const TopBar = ({ isConnected, systemPrompt, onSystemPromptChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempPrompt, setTempPrompt] = useState(systemPrompt);

    useEffect(() => {
        setTempPrompt(systemPrompt);
    }, [systemPrompt]);

    const handleSave = () => {
        onSystemPromptChange(tempPrompt);
        setIsEditing(false);
    };

    return (
        <div className="top-bar">
            <div className="top-bar-left">
                <div className="status-indicator">
                    <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
                    <span className="status-text">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
            </div>

            <div className="top-bar-right">
                <div className="persona-container" onClick={() => setIsEditing(true)}>
                    <span className="persona-label">SYSTEM PERSONA</span>
                    <p className="persona-text" title={systemPrompt}>
                        {systemPrompt}
                    </p>
                </div>
            </div>

            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        className="prompt-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="prompt-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <h3>EDIT SYSTEM PERSONA</h3>
                            <textarea
                                value={tempPrompt}
                                onChange={(e) => setTempPrompt(e.target.value)}
                                placeholder="Enter system instructions..."
                                autoFocus
                            />
                            <div className="modal-actions">
                                <button onClick={() => setIsEditing(false)} className="cancel-btn">CANCEL</button>
                                <button onClick={handleSave} className="save-btn">SAVE & RESTART</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TopBar;
