/** Renders an external link only for http(s) URLs; everything else
 *  (javascript:, data:, vbscript:) is rejected — React does NOT sanitize
 *  href, so scraped/DB content must be allowlisted here. */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
