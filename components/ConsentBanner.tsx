'use client'
import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { adsEnabled } from '@/lib/ads'

const CONSENT_KEY = 'jobkar:consent' // 'all' | 'essential'

type ConsentChoice = 'all' | 'essential'

/** localStorage is an external store — the choice is read through
 *  useSyncExternalStore (same pattern as the job-memory store), never via
 *  setState-in-effect. Same-tab writes notify manually; cross-tab writes
 *  arrive via the storage event. */
const listeners = new Set<() => void>()

function subscribeConsent(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function readConsent(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_KEY)
  } catch {
    // Storage blocked (private mode): treat as decided so the strip never
    // shows; the denied defaults from the layout snippet keep standing.
    return 'blocked'
  }
}

function notifyConsent() {
  listeners.forEach((l) => l())
}

/** Google Consent Mode v2 update; the matching *defaults* (all denied) are
 *  pushed by the inline snippet in app/layout.tsx BEFORE the AdSense loader
 *  runs, so a decline is honored from the very first ad request. */
function pushConsentUpdate(choice: ConsentChoice) {
  const granted = choice === 'all'
  const w = window as unknown as { dataLayer?: unknown[] }
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push([
    'consent',
    'update',
    {
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
      analytics_storage: 'denied',
    },
  ])
}

export default function ConsentBanner() {
  // Server snapshot is '' (decided) so the strip never renders into SSR HTML;
  // it appears for first-time visitors right after hydration.
  const consent = useSyncExternalStore(subscribeConsent, readConsent, () => '')

  if (!adsEnabled() || consent !== null) return null

  const choose = (choice: ConsentChoice) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, choice)
    } catch {
      // Storage blocked: still honor the click for this page view.
    }
    pushConsentUpdate(choice)
    notifyConsent()
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-40 bg-navy-800 text-gray-200 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center gap-3">
        <p className="text-sm flex-1 text-center sm:text-left">
          Jobkarbe is free because of ads. We use essential cookies to keep you signed in and
          advertising cookies to show you relevant ads. Read the{' '}
          <Link href="/privacy" className="underline text-white">
            privacy policy
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => choose('essential')}>
            Essential only
          </Button>
          <Button variant="primary" size="sm" onClick={() => choose('all')}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}
