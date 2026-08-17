'use client'
import { useEffect, useState, useRef } from 'react'
import { useInView, animate } from 'framer-motion'

interface StatsCounterProps {
  value: number
  label: string
  suffix?: string
}

export default function StatsCounter({ value, label, suffix = '' }: StatsCounterProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (inView) {
      const controls = animate(0, value, {
        duration: 2,
        ease: 'easeOut',
        onUpdate: (latest) => setDisplayValue(Math.round(latest)),
      })
      return () => controls.stop()
    }
  }, [inView, value])

  return (
    <div ref={ref}>
      <span className="text-3xl md:text-4xl font-extrabold">
        {displayValue}{suffix}
      </span>
      <p className="mt-1 text-sm opacity-80">{label}</p>
    </div>
  )
}