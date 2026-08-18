'use client'
import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/toast'
import { updateSettingsSchema } from '@/lib/validation'
import { DEFAULT_PRICES_PAISE, DEFAULT_COMMISSION_TIERS, DEFAULT_WITHDRAW_THRESHOLD, DEFAULT_JOB_TTL_DAYS, DEFAULT_FEATURED_DAYS, PLAN_NAMES, rupees } from '@/lib/plans'
import type { PlanName, SiteSettingsRow } from '@/lib/database.types'

interface FormState {
  prices: Record<PlanName, string>       // rupees, as typed
  tiers: Record<PlanName, string>        // percent, as typed
  withdrawThreshold: string
  jobTtlDays: string
  featuredDays: string
}

export default function SettingsTab() {
  const { toast } = useToast()
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        const s = (data as SiteSettingsRow | null) ?? null
        setForm({
          prices: {
            Weekly: String(rupees(s?.price_weekly ?? DEFAULT_PRICES_PAISE.Weekly)),
            Monthly: String(rupees(s?.price_monthly ?? DEFAULT_PRICES_PAISE.Monthly)),
            Quarterly: String(rupees(s?.price_quarterly ?? DEFAULT_PRICES_PAISE.Quarterly)),
            Annual: String(rupees(s?.price_annual ?? DEFAULT_PRICES_PAISE.Annual)),
          },
          tiers: {
            Weekly: String((s?.commission_tiers?.Weekly ?? DEFAULT_COMMISSION_TIERS.Weekly) * 100),
            Monthly: String((s?.commission_tiers?.Monthly ?? DEFAULT_COMMISSION_TIERS.Monthly) * 100),
            Quarterly: String((s?.commission_tiers?.Quarterly ?? DEFAULT_COMMISSION_TIERS.Quarterly) * 100),
            Annual: String((s?.commission_tiers?.Annual ?? DEFAULT_COMMISSION_TIERS.Annual) * 100),
          },
          withdrawThreshold: String(s?.withdraw_threshold ?? DEFAULT_WITHDRAW_THRESHOLD),
          jobTtlDays: String(s?.job_ttl_days ?? DEFAULT_JOB_TTL_DAYS),
          featuredDays: String(s?.featured_days ?? DEFAULT_FEATURED_DAYS),
        })
      })
  }, [])

  const save = async () => {
    if (!form) return
    const price = (v: string) => Math.round(Number(v) * 100)
    const pct = (v: string) => Number(v) / 100
    const values = {
      price_weekly: price(form.prices.Weekly),
      price_monthly: price(form.prices.Monthly),
      price_quarterly: price(form.prices.Quarterly),
      price_annual: price(form.prices.Annual),
      commission_tiers: {
        Weekly: pct(form.tiers.Weekly),
        Monthly: pct(form.tiers.Monthly),
        Quarterly: pct(form.tiers.Quarterly),
        Annual: pct(form.tiers.Annual),
      },
      withdraw_threshold: Number(form.withdrawThreshold),
      job_ttl_days: Number(form.jobTtlDays),
      featured_days: Number(form.featuredDays),
    }
    const parsed = updateSettingsSchema.safeParse(values)
    if (!parsed.success) {
      toast(parsed.error.issues[0]?.message ?? 'Check the values.', 'error')
      return
    }
    const v = parsed.data

    setBusy(true)
    const { error } = await supabase.rpc('update_site_settings', {
      p_price_weekly: v.price_weekly,
      p_price_monthly: v.price_monthly,
      p_price_quarterly: v.price_quarterly,
      p_price_annual: v.price_annual,
      p_commission_tiers: v.commission_tiers,
      p_withdraw_threshold: v.withdraw_threshold,
      p_job_ttl_days: v.job_ttl_days,
      p_featured_days: v.featured_days,
    })
    setBusy(false)
    if (error) {
      toast('Could not save settings.', 'error')
      return
    }
    toast('Settings saved — pricing on the public site updates immediately.')
  }

  if (!form) return <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">Loading…</div>

  const numberInput = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
      <h2 className="font-semibold text-gray-800">Site Settings</h2>
      <p className="mt-1 text-sm text-gray-500">Saved immediately to the database — the public site and payments use these values.</p>

      <div className="mt-6 space-y-6">
        <fieldset>
          <legend className="text-sm font-medium text-gray-700">Plan prices (₹)</legend>
          <div className="mt-2 grid sm:grid-cols-2 gap-4">
            {PLAN_NAMES.map((name) => (
              <div key={name}>
                <label htmlFor={`price-${name}`} className="block text-xs text-gray-500">{name}</label>
                <input
                  id={`price-${name}`}
                  type="number" min={1}
                  value={form.prices[name]}
                  onChange={(e) => setForm((f) => f && { ...f, prices: { ...f.prices, [name]: e.target.value } })}
                  className={numberInput}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-gray-700">Referral commission (%)</legend>
          <div className="mt-2 grid sm:grid-cols-2 gap-4">
            {PLAN_NAMES.map((name) => (
              <div key={name}>
                <label htmlFor={`tier-${name}`} className="block text-xs text-gray-500">{name}</label>
                <input
                  id={`tier-${name}`}
                  type="number" min={0} max={90} step={0.5}
                  value={form.tiers[name]}
                  onChange={(e) => setForm((f) => f && { ...f, tiers: { ...f.tiers, [name]: e.target.value } })}
                  className={numberInput}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="set-threshold" className="block text-sm font-medium text-gray-700">Withdrawal minimum (₹)</label>
            <input id="set-threshold" type="number" min={1} value={form.withdrawThreshold} onChange={(e) => setForm((f) => f && { ...f, withdrawThreshold: e.target.value })} className={numberInput} />
          </div>
          <div>
            <label htmlFor="set-ttl" className="block text-sm font-medium text-gray-700">Job expiry (days)</label>
            <input id="set-ttl" type="number" min={1} value={form.jobTtlDays} onChange={(e) => setForm((f) => f && { ...f, jobTtlDays: e.target.value })} className={numberInput} />
          </div>
          <div>
            <label htmlFor="set-featured" className="block text-sm font-medium text-gray-700">Featured duration (days)</label>
            <input id="set-featured" type="number" min={1} value={form.featuredDays} onChange={(e) => setForm((f) => f && { ...f, featuredDays: e.target.value })} className={numberInput} />
          </div>
        </div>
      </div>

      <Button className="mt-6" onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save Settings'}
      </Button>
    </div>
  )
}
