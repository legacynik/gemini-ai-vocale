import { useEffect, useRef } from 'react'
import './AnimatedBackground.css'

const AnimatedBackground = () => {
    const canvasRef = useRef(null)
    const dotsRef = useRef([])
    const animationRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            initDots()
        }

        const initDots = () => {
            const dotCount = Math.floor((canvas.width * canvas.height) / 15000)
            dotsRef.current = []

            for (let i = 0; i < dotCount; i++) {
                dotsRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    radius: Math.random() * 2 + 1
                })
            }
        }

        const animate = () => {
            ctx.fillStyle = 'rgba(10, 10, 30, 0.05)'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            dotsRef.current.forEach((dot, i) => {
                // Update position
                dot.x += dot.vx
                dot.y += dot.vy

                // Bounce off edges
                if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1
                if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1

                // Draw dot
                ctx.beginPath()
                ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2)
                ctx.fillStyle = 'rgba(100, 150, 255, 0.6)'
                ctx.fill()

                // Draw connections
                dotsRef.current.slice(i + 1).forEach(otherDot => {
                    const dx = dot.x - otherDot.x
                    const dy = dot.y - otherDot.y
                    const distance = Math.sqrt(dx * dx + dy * dy)

                    if (distance < 150) {
                        ctx.beginPath()
                        ctx.moveTo(dot.x, dot.y)
                        ctx.lineTo(otherDot.x, otherDot.y)
                        ctx.strokeStyle = `rgba(100, 150, 255, ${0.2 * (1 - distance / 150)})`
                        ctx.lineWidth = 0.5
                        ctx.stroke()
                    }
                })
            })

            animationRef.current = requestAnimationFrame(animate)
        }

        resize()
        window.addEventListener('resize', resize)
        animate()

        return () => {
            window.removeEventListener('resize', resize)
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [])

    return <canvas ref={canvasRef} className="animated-background" />
}

export default AnimatedBackground
