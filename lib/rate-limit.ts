// ponytail: in-memory limiter — resets when a serverless instance recycles;
// swap for Upstash Redis if abuse shows up in production logs.

const hits = new Map<string, number[]>()
const SWEEP_INTERVAL_MS = 10 * 60 * 1000
let lastSweep = Date.now()

/** Returns true if the request is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  // Opportunistic sweep: bound memory by evicting keys whose windows are
  // empty (oldest-keyed users that stopped calling).
  if (now - lastSweep > SWEEP_INTERVAL_MS || hits.size > 1000) {
    lastSweep = now
    hits.forEach((arr, k) => {
      if (arr.every((t) => now - t >= windowMs)) hits.delete(k)
    })
  }

  const window = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (window.length >= limit) {
    hits.set(key, window)
    return false
  }
  window.push(now)
  hits.set(key, window)
  return true
}
