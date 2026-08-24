import { describe, expect, it } from 'vitest'
import { mergeMarks } from '../lib/jobMarks'

describe('mergeMarks', () => {
  it('empty everywhere → empty result', () => {
    const r = mergeMarks([], [], [])
    expect(r.saved.size).toBe(0)
    expect(r.applied.size).toBe(0)
    expect(r.toUpsert).toEqual([])
  })

  it('server-only marks become the merged sets with nothing to push', () => {
    const r = mergeMarks([], [], [{ job_id: 'a', saved: true, applied: false }])
    expect(r.saved.has('a')).toBe(true)
    expect(r.toUpsert).toEqual([])
  })

  it('local-only marks produce toUpsert rows', () => {
    const r = mergeMarks(['x'], ['y'], [])
    expect(r.saved.has('x')).toBe(true)
    expect(r.applied.has('y')).toBe(true)
    expect(r.toUpsert).toContainEqual({ job_id: 'x', saved: true, applied: false })
    expect(r.toUpsert).toContainEqual({ job_id: 'y', saved: false, applied: true })
  })

  it('union: device and account flags combine per job', () => {
    const r = mergeMarks(['a'], [], [{ job_id: 'a', saved: false, applied: true }])
    expect(r.saved.has('a')).toBe(true)
    expect(r.applied.has('a')).toBe(true)
    expect(r.toUpsert).toEqual([{ job_id: 'a', saved: true, applied: true }])
  })

  it('already-synced device marks produce no upserts', () => {
    const r = mergeMarks(['a'], ['b'], [
      { job_id: 'a', saved: true, applied: false },
      { job_id: 'b', saved: false, applied: true },
    ])
    expect(r.toUpsert).toEqual([])
  })

  it('ignores server rows the device never marked (except as union input)', () => {
    const r = mergeMarks([], [], [{ job_id: 'z', saved: true, applied: true }])
    expect(r.saved.has('z')).toBe(true)
    expect(r.toUpsert).toEqual([])
  })
})
