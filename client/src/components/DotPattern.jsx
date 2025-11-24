import { useEffect, useRef } from 'react';
import './DotPattern.css';

const DotPattern = () => {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: null, y: null });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];
        let time = 0;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const handleMouseMove = (e) => {
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouseRef.current.x = null;
            mouseRef.current.y = null;
        };

        class Particle {
            constructor(x, y, size) {
                this.baseX = x;
                this.baseY = y;
                this.x = x;
                this.y = y;
                this.size = size;
                this.color = 'rgba(0, 217, 255, 0.15)'; // Slightly more visible base
            }

            update() {
                // Ambient gentle flow (sine wave)
                // "Flow slightly"
                const flowX = Math.sin(time * 0.02 + this.baseY * 0.005) * 2;
                const flowY = Math.cos(time * 0.02 + this.baseX * 0.005) * 2;

                let targetX = this.baseX + flowX;
                let targetY = this.baseY + flowY;

                // Mouse Wave/Ripple Effect
                if (mouseRef.current.x != null) {
                    const dx = mouseRef.current.x - this.x;
                    const dy = mouseRef.current.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = 300;

                    if (distance < maxDist) {
                        // Create a wave ripple
                        // Pushing away slightly + sine wave ripple based on distance
                        const force = (maxDist - distance) / maxDist;
                        const angle = Math.atan2(dy, dx);

                        // Ripple effect:
                        // Push away: -Math.cos(angle) * force * 20
                        // Ripple: Math.sin(distance * 0.05 - time * 0.1) * 10

                        const push = 30 * force;
                        const ripple = Math.sin(distance * 0.1 - time * 0.2) * 5 * force;

                        targetX -= Math.cos(angle) * (push + ripple);
                        targetY -= Math.sin(angle) * (push + ripple);
                    }
                }

                // Smooth ease to target
                this.x += (targetX - this.x) * 0.1;
                this.y += (targetY - this.y) * 0.1;
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        const init = () => {
            particles = [];
            const dotRadius = 6;
            const spacing = 16;

            const rows = Math.ceil(canvas.height / spacing);
            const cols = Math.ceil(canvas.width / spacing);

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const xPos = x * spacing + spacing / 2;
                    const yPos = y * spacing + spacing / 2;
                    particles.push(new Particle(xPos, yPos, dotRadius));
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            time++;

            particles.forEach(p => {
                p.update();
                p.draw();
            });

            // Draw Contrast Dot (Mouse Cursor)
            if (mouseRef.current.x != null) {
                ctx.beginPath();
                ctx.arc(mouseRef.current.x, mouseRef.current.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffffff';
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener('resize', () => {
            resizeCanvas();
            init();
        });
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        resizeCanvas();
        init();
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="dot-pattern-container">
            <canvas ref={canvasRef} className="dot-pattern-canvas" />
            <div className="gradient-overlay" />
        </div>
    );
};

export default DotPattern;
