/** Per-browser job memory (saved ♥ / applied ✓) — localStorage only, no
 *  account needed. Store is injected so tests can use a plain object. */

export const SAVED_KEY = 'jobkar:saved'
export const APPLIED_KEY = 'jobkar:applied'
export const RECENTS_KEY = 'jobkar:recent-searches'

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
  invalidateSnapshots()
  notifyListeners()
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

/** Recent-search memory (jobs feed). Same store, own key, same guarantees. */
export function readRecents(store: MemoryStore): string[] {
  try {
    const parsed = JSON.parse(store.getItem(RECENTS_KEY) ?? '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function writeRecents(store: MemoryStore, recents: string[]): void {
  try {
    store.setItem(RECENTS_KEY, JSON.stringify(recents))
  } catch {
    // Storage blocked — recents are a convenience, not a feature.
  }
  invalidateSnapshots()
  notifyListeners()
}

// --- External-store bridge for useSyncExternalStore consumers -------------
// localStorage is not observable, so every write funnels through this lib;
// writes invalidate the cached snapshots and wake subscribers. Cross-tab
// writes arrive via the storage event.

const listeners = new Set<() => void>()

function notifyListeners(): void {
  listeners.forEach((l) => l())
}

function invalidateSnapshots(): void {
  cachedSaved = null
  cachedRecents = null
  savedHasCache.clear()
  appliedHasCache.clear()
}

let cachedSaved: Set<string> | null = null
let cachedRecents: string[] | null = null
// Per-key boolean caches so `.has(jobId)` consumers never re-parse storage
// between writes.
const appliedHasCache = new Map<string, boolean>()
const savedHasCache = new Map<string, boolean>()

function onExternalStorage(e: StorageEvent): void {
  if (e.key === null || e.key === SAVED_KEY || e.key === APPLIED_KEY || e.key === RECENTS_KEY) {
    invalidateSnapshots()
    notifyListeners()
  }
}

/** Subscribe to job-memory writes (same tab via this lib, cross tab via the
 *  storage event). Pass to useSyncExternalStore as-is. */
export function subscribeJobMemory(listener: () => void): () => void {
  listeners.add(listener)
  // Refcount the window listener: identical function references dedupe in
  // the DOM, so it must be added once for the FIRST subscriber and removed
  // only when the LAST unsubscribes — otherwise one unmounting heart would
  // kill cross-tab sync for every subscriber still on the page.
  if (typeof window !== 'undefined' && listeners.size === 1) {
    window.addEventListener('storage', onExternalStorage)
  }
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined' && listeners.size === 0) {
      window.removeEventListener('storage', onExternalStorage)
    }
  }
}

/** Referentially stable snapshots — getSnapshot must return the same value
 *  between writes or React loops. */
export function getSavedSnapshot(): Set<string> {
  cachedSaved ??= savedSet(window.localStorage)
  return cachedSaved
}

export function getRecentsSnapshot(): string[] {
  cachedRecents ??= readRecents(window.localStorage)
  return cachedRecents
}

const EMPTY_SAVED = new Set<string>()
const EMPTY_RECENTS: string[] = []

export function getEmptySavedSnapshot(): Set<string> {
  return EMPTY_SAVED
}

export function getEmptyRecentsSnapshot(): string[] {
  return EMPTY_RECENTS
}

/** Boolean `.has()` snapshots: booleans are referentially stable, the cache
 *  just avoids re-parsing storage for every mounted heart per render. */
export function getSavedHasSnapshot(jobId: string): () => boolean {
  return () => {
    const hit = savedHasCache.get(jobId)
    if (hit !== undefined) return hit
    const value = savedSet(window.localStorage).has(jobId)
    savedHasCache.set(jobId, value)
    return value
  }
}

export function getAppliedHasSnapshot(jobId: string): () => boolean {
  return () => {
    const hit = appliedHasCache.get(jobId)
    if (hit !== undefined) return hit
    const value = appliedSet(window.localStorage).has(jobId)
    appliedHasCache.set(jobId, value)
    return value
  }
}
