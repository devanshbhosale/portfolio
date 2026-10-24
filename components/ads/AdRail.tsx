import AdSlot from './AdSlot'
import type { AdSlotKey } from '@/lib/ads'

interface AdRailProps {
  slot: AdSlotKey
  className?: string
}

/** Sticky side rail flanking page content at xl+. Hidden below xl (mobile
 *  keeps its single column) and collapses entirely when ads are not
 *  configured. Sticky offset clears the fixed navbar (h-16 + breathing
 *  room). */
export default function AdRail({ slot, className = '' }: AdRailProps) {
  return (
    <aside aria-label="Advertisement" className={`hidden xl:block ${className}`}>
      <div className="sticky top-20">
        <AdSlot slot={slot} className="w-full" />
      </div>
    </aside>
  )
}
