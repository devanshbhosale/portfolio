'use client'
import { useEffect } from 'react'
import { AD_MIN_HEIGHTS, AD_SLOTS, ADSENSE_CLIENT, adsEnabled, type AdSlotKey } from '@/lib/ads'

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[]
  }
}

interface AdSlotProps {
  slot: AdSlotKey
  className?: string
}

/** One AdSense unit. Renders nothing in production until the publisher id
 *  and the slot id exist; in dev it reserves the space with a labelled box
 *  so the layout can be eyeballed before approval. */
export default function AdSlot({ slot, className = '' }: AdSlotProps) {
  const slotId = AD_SLOTS[slot]
  const configured = adsEnabled() && slotId !== '0'

  if (!configured) {
    if (process.env.NODE_ENV === 'production') return null
    return (
      <div
        aria-hidden
        className={`flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-100/60 text-xs tracking-wide text-gray-400 ${className}`}
        style={{ minHeight: AD_MIN_HEIGHTS[slot] }}
      >
        Advertisement
      </div>
    )
  }

  return <AdUnit slotId={slotId} minHeight={AD_MIN_HEIGHTS[slot]} className={className} />
}

function AdUnit({ slotId, minHeight, className }: { slotId: string; minHeight: number; className: string }) {
  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // Loader not ready yet — AdSense drains the queue when it arrives.
    }
  }, [slotId])

  return (
    <div className={className} style={{ minHeight }}>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', minHeight }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
