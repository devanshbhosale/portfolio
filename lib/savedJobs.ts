/** Per-browser job memory (saved ♥ / applied ✓) — localStorage only, no
 *  account needed. Store is injected so tests can use a plain object. */

export const SAVED_KEY = 'jobkar:saved'
export const APPLIED_KEY = 'jobkar:applied'

export interface MemoryStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function readSet(store: MemoryStore, key: string): Set<string> {
  try {
    const raw = store.getItem(key)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    return new Set(
      Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [],
    )
  } catch {
    return new Set()
  }
}

function writeSet(store: MemoryStore, key: string, set: Set<string>): void {
  try {
    store.setItem(key, JSON.stringify(Array.from(set)))
  } catch {
    // Private-browsing/quota errors — saving just won't persist this session.
  }
}

export function savedSet(store: MemoryStore): Set<string> {
  return readSet(store, SAVED_KEY)
}

export function appliedSet(store: MemoryStore): Set<string> {
  return readSet(store, APPLIED_KEY)
}

/** Toggle one job; returns the new saved set. */
export function toggleSaved(store: MemoryStore, jobId: string): Set<string> {
  const next = savedSet(store)
  if (next.has(jobId)) next.delete(jobId)
  else next.add(jobId)
  writeSet(store, SAVED_KEY, next)
  return next
}

export function markApplied(store: MemoryStore, jobId: string): void {
  const next = appliedSet(store)
  next.add(jobId)
  writeSet(store, APPLIED_KEY, next)
}

/** Persist a full set (login merge in lib/jobMarks writes the union back). */
export function writeSavedSet(store: MemoryStore, set: Set<string>): void {
  writeSet(store, SAVED_KEY, set)
}

export function writeAppliedSet(store: MemoryStore, set: Set<string>): void {
  writeSet(store, APPLIED_KEY, set)
}
