import { z } from 'zod'

export const REPORT_REASONS = ['fake_scam', 'expired', 'asks_for_money', 'discriminatory', 'other'] as const

export const reportSchema = z.object({
  jobId: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid job id',
  ),
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500).optional(),
})
