import { describe, it, expect } from 'vitest'
import { reportSchema } from '@/lib/validation'

describe('reportSchema — listing reports', () => {
  const jobId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

  it('accepts a valid report with and without a note', () => {
    expect(reportSchema.safeParse({ jobId, reason: 'fake_scam' }).success).toBe(true)
    expect(reportSchema.safeParse({ jobId, reason: 'other', note: 'looks off' }).success).toBe(true)
  })

  it('rejects unknown reasons, bad ids, and long notes', () => {
    expect(reportSchema.safeParse({ jobId, reason: 'spam' }).success).toBe(false)
    expect(reportSchema.safeParse({ jobId: 'not-a-uuid', reason: 'fake_scam' }).success).toBe(false)
    expect(reportSchema.safeParse({ jobId, reason: 'fake_scam', note: 'x'.repeat(501) }).success).toBe(false)
    expect(reportSchema.safeParse({ reason: 'fake_scam' }).success).toBe(false)
  })
})
