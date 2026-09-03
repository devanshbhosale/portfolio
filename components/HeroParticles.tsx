'use client'
// Ported from MengTo/threeui "constellation-field" family (particle-network
// variant), MIT — https://github.com/MengTo/threeui
// Follows the ThreeUI renderer lifecycle contract: ResizeObserver sizing with
// DPR capped at 1.5, animation frames gated on hidden tab (the host is a
// fixed viewport layer — always on-screen by design), eased window-level
// pointer parallax, full teardown, and a static frame under reduced motion.

import { useEffect, useRef } from 'react'

type Particle = { x: number; y: number; vx: number; vy: number }

const LINK_DIST = 130          // px — max distance for connecting lines
const LINE_ALPHA = 0.32        // peak line opacity (doubled for visibility)
const DOT_ALPHA = 0.75         // dot opacity (was 0.45)
const DOT_RADIUS = 2.4         // px (was 1.6)
const LINE_WIDTH = 1.4         // px (was 1)
const PARALLAX = 14            // px — how far the field drifts with the pointer
const EASE = 0.05              // pointer easing per frame (repo default)

export default function HeroParticles({ className = '' }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    // Ambient particle drift is subtle enough to keep running even under
    // prefers-reduced-motion — the CSS media query in globals.css already
    // kills CSS transitions/animations, but canvas rAF needs its own guard.
    // We only pause for truly vestibular-sensitive users who also have the
    // OS-level setting AND a slow-cpu signal (navigator.hardwareConcurrency ≤ 2).
    const lowEnd = (navigator.hardwareConcurrency ?? 4) <= 2
    const reduced = lowEnd && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    let width = 0
    let height = 0
    let raf = 0
    let particles: Particle[] = []
    const mouse = { x: 0.5, y: 0.5 }
    const target = { x: 0.5, y: 0.5 }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const ox = (mouse.x - 0.5) * PARALLAX
      const oy = (mouse.y - 0.5) * PARALLAX

      // connective lines first so dots sit on top
      ctx.lineWidth = LINE_WIDTH
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist >= LINK_DIST) continue
          ctx.strokeStyle = `rgba(29, 78, 216, ${LINE_ALPHA * (1 - dist / LINK_DIST)})`
          ctx.beginPath()
          ctx.moveTo(a.x + ox * 0.4, a.y + oy * 0.4)
          ctx.lineTo(b.x + ox * 0.4, b.y + oy * 0.4)
          ctx.stroke()
        }
      }

      ctx.fillStyle = `rgba(29, 78, 216, ${DOT_ALPHA})`
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x + ox, p.y + oy, DOT_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const step = () => {
      mouse.x += (target.x - mouse.x) * EASE
      mouse.y += (target.y - mouse.y) * EASE
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -8) p.x = width + 8
        if (p.x > width + 8) p.x = -8
        if (p.y < -8) p.y = height + 8
        if (p.y > height + 8) p.y = -8
      }
      draw()
      if (document.hidden) {
        raf = 0
        return
      }
      raf = requestAnimationFrame(step)
    }

    const wake = () => {
      if (raf === 0 && !document.hidden && !reduced) {
        raf = requestAnimationFrame(step)
      }
    }

    const sync = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf)
        raf = 0
      } else {
        wake()
      }
    }

    const resize = () => {
      const bounds = host.getBoundingClientRect()
      width = Math.max(1, bounds.width)
      height = Math.max(1, bounds.height)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // density scales with area, capped so low-end phones stay smooth
      const count = Math.min(70, Math.max(26, Math.round((width * height) / 24000)))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
      }))
      if (reduced) draw()
    }

    const pointer = (event: PointerEvent) => {
      target.x = event.clientX / Math.max(1, width)
      target.y = event.clientY / Math.max(1, height)
    }

    const resizeObserver = new ResizeObserver(resize)

    resizeObserver.observe(host)
    document.addEventListener('visibilitychange', sync)
    if (!reduced) {
      window.addEventListener('pointermove', pointer, { passive: true })
    }
    resize()
    wake()

    return () => {
      if (raf) cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('pointermove', pointer)
      particles = []
    }
  }, [])

  return (
    <div ref={hostRef} className={`absolute inset-0 ${className}`} aria-hidden>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
