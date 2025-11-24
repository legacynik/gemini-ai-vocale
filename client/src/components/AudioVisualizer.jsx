import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import './AudioVisualizer.css'

const AudioVisualizer = ({ audioData, isRecording, isSpeaking }) => {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const draw = () => {
            const width = canvas.width
            const height = canvas.height

            ctx.clearRect(0, 0, width, height)

            if (isRecording || isSpeaking) {
                const barWidth = width / audioData.length
                const centerY = height / 2

                for (let i = 0; i < audioData.length; i++) {
                    const barHeight = (audioData[i] / 255) * height * 0.8
                    const x = i * barWidth
                    const y = centerY - barHeight / 2

                    const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
                    gradient.addColorStop(0, isRecording ? '#4285f4' : '#ea4335')
                    gradient.addColorStop(1, isRecording ? '#667eea' : '#f093fb')

                    ctx.fillStyle = gradient
                    ctx.fillRect(x, y, barWidth - 2, barHeight)
                }
            } else {
                // Idle state - draw subtle wave
                ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)'
                ctx.lineWidth = 2
                ctx.beginPath()

                for (let i = 0; i < width; i++) {
                    const y = height / 2 + Math.sin(i * 0.02 + Date.now() * 0.001) * 20
                    if (i === 0) {
                        ctx.moveTo(i, y)
                    } else {
                        ctx.lineTo(i, y)
                    }
                }
                ctx.stroke()
            }
        }

        const interval = setInterval(draw, 50)
        return () => clearInterval(interval)
    }, [audioData, isRecording, isSpeaking])

    return (
        <motion.div
            className="visualizer-container"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="audio-visualizer"
            />
        </motion.div>
    )
}

export default AudioVisualizer
