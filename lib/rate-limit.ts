// ponytail: in-memory limiter — resets when a serverless instance recycles;
// swap for Upstash Redis if abuse shows up in production logs.

const hits = new Map<string, number[]>()

/** Returns true if the request is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const window = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (window.length >= limit) {
    hits.set(key, window)
    return false
  }
  window.push(now)
  hits.set(key, window)
  return true
}
