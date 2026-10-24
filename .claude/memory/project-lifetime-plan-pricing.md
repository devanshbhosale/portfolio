---
name: project-lifetime-plan-pricing
description: 2026-08-26 plan set cut to Weekly/Monthly/Lifetime + jobs24x-style
  pricing page — SHIPPED & verified live; prices AND MRPs dashboard-editable
metadata:
  node_type: memory
  type: project
  originSessionId: sess_601a5d93-2615-4660-bd39-ecf495e0abe4
---

Shipped 2026-08-26 (website `83d19f0` + smoke fix `3cae8fc`, dashboard local `6994114`, DB migration `lifetime-plan-and-mrp-prices` applied live via Supabase MCP). Offered plans = **Weekly ₹149 / Monthly ₹349 / Lifetime ₹999** (user had already changed Weekly/Monthly prices in site_settings — live values, not the code defaults ₹99/₹199). Lifetime = one-time, 36,500-day expiry so global `premium_expires_at > now()` rule is untouched. Referral: 20%/20%/25%.

Key invariants to preserve:
- **Legacy Quarterly/Annual stay fulfillable**: DB CHECKs accept all five names; webhook + reconciler validate against `FULFILLABLE_PLAN_NAMES`; `process_payment` keeps their branches with a **plan-aware commission fallback** (legacy tiers pay 25% even if a 3-key jsonb save drops their keys) — pre-ship review found and fixed the 20%-underpay bug.
- `create-order` zod gate (`z.enum(PLAN_NAMES)`) auto-rejects retired plans server-side.
- **Pricing AND display MRPs are dashboard-editable**: site_settings columns price_lifetime/mrp_weekly/mrp_monthly/mrp_lifetime; SettingsTab saves via replaced 9-arg `update_site_settings_desktop`. Savings badges compute live from MRP vs price; hidden when MRP <= price.
- /pricing = server component (real job counts + live settings, both degrade to zeros/defaults on DB blip) → client island `components/PricingPlans.tsx` (RSC motion.* rule respected). Shared 7-feature checklist (hidden jobs, real salaries, filters, saves/alerts, early access, direct apply, priority support); Monthly card highlighted.
- Old per-plan perks/strikethrough exports removed from lib/plans.ts (PLAN_TAGLINES, PLAN_BILLING_NOTES, SHARED_FEATURES, DEFAULT_MRPS_PAISE now).

Verified live: /api/settings returns 3 prices+3 MRPs; /pricing 200 with all sections; homepage/FAQ 200; smoke script all-pass (script itself fixed — was TS-flavored .mjs that node couldn't run). Related: [[jobkar-hardening-plan]], [[feedback-trust-enforcement]], [[jobkar-brand-palette]].
