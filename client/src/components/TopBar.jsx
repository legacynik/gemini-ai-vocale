import { motion } from 'framer-motion';
import { useState } from 'react';
import './TopBar.css';

const TopBar = ({ isConnected, systemPrompt, onSystemPromptChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempPrompt, setTempPrompt] = useState(systemPrompt);

    const handleSave = () => {
        onSystemPromptChange(tempPrompt);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTempPrompt(systemPrompt);
        setIsEditing(false);
    };

    return (
        <motion.div
            className="top-bar"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
        >
            <div className="top-bar-left">
                <h1 className="title glow-text">VOICE AI AGENT // GEMINI 2.5</h1>
            </div>
            <div className="top-bar-right">
                <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`}>
                    <span className="status-dot"></span>
                    <span className="status-text">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
                <div className="system-persona">
                    {!isEditing ? (
                        <button
                            className="persona-button"
                            onClick={() => setIsEditing(true)}
                        >
                            <span className="persona-label">SYSTEM PERSONA</span>
                            <span className="persona-icon">✎</span>
                        </button>
                    ) : (
                        <div className="persona-editor">
                            <textarea
                                value={tempPrompt}
                                onChange={(e) => setTempPrompt(e.target.value)}
                                className="persona-input"
                                rows={3}
                                placeholder="Enter system prompt..."
                            />
                            <div className="persona-actions">
                                <button onClick={handleSave} className="btn-save">SAVE</button>
                                <button onClick={handleCancel} className="btn-cancel">CANCEL</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default TopBar;
