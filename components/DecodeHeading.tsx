'use client'
// Headline scramble-decode, ported from MengTo/threeui "article-headings"
// (articleHeadingDecode.ts), MIT — https://github.com/MengTo/threeui
// Same eased character-budget reveal and glyph pool. Adds: styled segments
// (each character keeps its own Tailwind class), sessionStorage guard so it
// plays once per session, and a static render under reduced-motion / no-JS.

import { useEffect, useRef } from 'react'

const POOL = '#%&@$/\\<>*+=~ABCDEFGHKMNPRSTUVWXYZ0123456789'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const easeOut = (v: number) => 1 - Math.pow(1 - v, 2)

export type DecodeSegment = { text: string; className?: string }

export default function DecodeHeading({
  segments,
  duration = 1300,
}: {
  segments: DecodeSegment[]
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const fullText = segments.map((s) => s.text).join('')

  // Flatten once per render — stable because segments are static literals.
  const chars: Array<{ ch: string; cls?: string }> = []
  segments.forEach((seg) => {
    Array.from(seg.text).forEach((ch) => chars.push({ ch, cls: seg.className }))
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let played = false
    try {
      played = window.sessionStorage.getItem('jobkar-decode-v1') === '1'
    } catch {
      /* private mode: play on every mount */
    }
    if (played) return undefined

    const spans = Array.from(el.children) as HTMLSpanElement[]
    const originals = chars.map((c) => c.ch)
    let raf = 0
    const start = performance.now()

    const markPlayed = () => {
      try {
        window.sessionStorage.setItem('jobkar-decode-v1', '1')
      } catch {
        /* noop */
      }
    }

    const frame = (now: number) => {
      const progress = clamp((now - start) / Math.max(1, duration), 0, 1)
      const budget = Math.floor(easeOut(progress) * originals.length)

      for (let i = 0; i < originals.length; i += 1) {
        const ch = originals[i]
        if (ch === ' ') continue
        if (i < budget) {
          if (spans[i].textContent !== ch) spans[i].textContent = ch
        } else if (Math.random() > 0.92) {
          spans[i].textContent = POOL[(Math.random() * POOL.length) | 0]
        }
      }

      if (progress < 1) {
        raf = requestAnimationFrame(frame)
      } else {
        originals.forEach((ch, i) => {
          spans[i].textContent = ch
        })
        markPlayed()
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  return (
    <span ref={ref} aria-label={fullText}>
      {chars.map((c, i) => (
        <span key={i} aria-hidden className={c.cls}>
          {c.ch}
        </span>
      ))}
    </span>
  )
}
