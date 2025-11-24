import { motion } from 'framer-motion';
import { useRef, useEffect } from 'react';
import './CircularVisualizer.css';

const CircularVisualizer = ({ audioData, isRecording, isSpeaking }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = 60; // Smaller radius
        const barCount = 48; // Fewer bars for cleaner look

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Only animate if recording or speaking
            if (isRecording || isSpeaking) {
                // Draw radial bars
                for (let i = 0; i < barCount; i++) {
                    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
                    const dataIndex = Math.floor((i / barCount) * audioData.length);
                    const value = audioData[dataIndex] || 0;

                    // Normalize and amplify
                    const normalizedValue = value / 255;
                    const barHeight = normalizedValue * 40 + 2; // Shorter bars

                    const x1 = centerX + Math.cos(angle) * baseRadius;
                    const y1 = centerY + Math.sin(angle) * baseRadius;
                    const x2 = centerX + Math.cos(angle) * (baseRadius + barHeight);
                    const y2 = centerY + Math.sin(angle) * (baseRadius + barHeight);

                    // Create gradient
                    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                    gradient.addColorStop(0, 'rgba(0, 217, 255, 0.5)');
                    gradient.addColorStop(1, 'rgba(0, 217, 255, 0)');

                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                }
            }

            // Draw center circle (always visible but subtle)
            ctx.beginPath();
            ctx.arc(centerX, centerY, baseRadius - 5, 0, Math.PI * 2);
            ctx.strokeStyle = isRecording ? 'rgba(255, 68, 68, 0.3)' : 'rgba(0, 217, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [audioData, isRecording, isSpeaking]);

    return (
        <motion.div
            className="circular-visualizer"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
        >
            <canvas
                ref={canvasRef}
                width={300}
                height={300}
                className="visualizer-canvas"
            />
        </motion.div>
    );
};

export default CircularVisualizer;
