'use client'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { ADSENSE_CLIENT, adsEnabled } from '@/lib/ads'

// Policy: ads belong next to content value. Auth and account pages have
// none, so the loader never runs there.
const AD_FREE_PATHS = ['/login', '/signup', '/profile']

/** Loads the AdSense library after hydration, everywhere except auth and
 *  account pages. Dark (renders nothing) until NEXT_PUBLIC_ADSENSE_CLIENT
 *  is set. */
export default function AdSenseScript() {
  const pathname = usePathname()
  if (!adsEnabled()) return null
  if (AD_FREE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null
  return (
    <Script
      id="adsense-loader"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  )
}
