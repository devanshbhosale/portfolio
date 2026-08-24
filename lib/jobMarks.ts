// Syncs saved ♥ / applied ✓ job memory to the job_marks table for logged-in
// users. localStorage stays the guest cache + fast read path; on login the
// device's marks merge INTO the account (union), then the account is truth.
import { appliedSet, savedSet, writeAppliedSet, writeSavedSet } from './savedJobs'

// Lazy: importing lib/supabase at module scope throws without env vars,
// which would break unit tests of the pure merge logic above.
async function client() {
  const { supabase } = await import('./supabase')
  return supabase
}

export interface ServerMark {
  job_id: string
  saved: boolean
  applied: boolean
}

export interface MergeResult {
  saved: Set<string>
  applied: Set<string>
  toUpsert: { job_id: string; saved: boolean; applied: boolean }[]
}

/** Pure merge: a job is saved/applied if the server row OR the device says
 *  so. toUpsert = local marks missing on the server or with stale flags. */
export function mergeMarks(localSaved: string[], localApplied: string[], server: ServerMark[]): MergeResult {
  const ids = new Set([...localSaved, ...localApplied, ...server.map((m) => m.job_id)])
  const saved = new Set<string>()
  const applied = new Set<string>()
  for (const id of ids) {
    if (localSaved.includes(id)) saved.add(id)
    if (localApplied.includes(id)) applied.add(id)
  }
  for (const m of server) {
    if (m.saved) saved.add(m.job_id)
    if (m.applied) applied.add(m.job_id)
  }

  const toUpsert: MergeResult['toUpsert'] = []
  for (const id of ids) {
    // Only device-known ids need pushing — server-only rows are already true.
    if (!localSaved.includes(id) && !localApplied.includes(id)) continue
    const row = server.find((m) => m.job_id === id)
    const nextSaved = saved.has(id)
    const nextApplied = applied.has(id)
    if (!row || row.saved !== nextSaved || row.applied !== nextApplied) {
      toUpsert.push({ job_id: id, saved: nextSaved, applied: nextApplied })
    }
  }

  return { saved, applied, toUpsert }
}

/** Login-time hydration: pull account marks, union with this device's,
 *  push the difference up, write the union back to localStorage. */
export async function hydrateMarks(userId: string): Promise<void> {
  const supabase = await client()
  const { data, error } = await supabase
    .from('job_marks')
    .select('job_id,saved,applied')
    .eq('user_id', userId)
  if (error) throw error

  const merged = mergeMarks(
    Array.from(savedSet(window.localStorage)),
    Array.from(appliedSet(window.localStorage)),
    (data ?? []) as ServerMark[],
  )

  if (merged.toUpsert.length > 0) {
    const { error: upsertError } = await supabase
      .from('job_marks')
      .upsert(
        merged.toUpsert.map((m) => ({ user_id: userId, ...m })),
        { onConflict: 'user_id,job_id' },
      )
    if (upsertError) throw upsertError
  }

  writeSavedSet(window.localStorage, merged.saved)
  writeAppliedSet(window.localStorage, merged.applied)
}

/** Fire-and-forget remote toggles (localStorage stays the optimistic path;
 *  upsert touches only the payload columns, so the sibling flag survives). */
export async function setSavedRemote(userId: string, jobId: string, nextSaved: boolean): Promise<void> {
  const supabase = await client()
  const { error } = await supabase
    .from('job_marks')
    .upsert({ user_id: userId, job_id: jobId, saved: nextSaved }, { onConflict: 'user_id,job_id' })
  if (error) console.warn('job_marks save sync failed:', error.message)
}

export async function markAppliedRemote(userId: string, jobId: string, currentSaved: boolean): Promise<void> {
  const supabase = await client()
  const { error } = await supabase
    .from('job_marks')
    .upsert({ user_id: userId, job_id: jobId, applied: true, saved: currentSaved }, { onConflict: 'user_id,job_id' })
  if (error) console.warn('job_marks applied sync failed:', error.message)
}
