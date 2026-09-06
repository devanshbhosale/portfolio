# Compliance Triggers — deferred items and exactly when each one fires

Nothing here is needed today. Each row lists the trigger that means it is
needed. Check this page when revenue grows, the team grows, or new tooling is
added.

| Item | Fires when | What to do |
|---|---|---|
| GST registration + tax-inclusive pricing | Revenue becomes material (sustained 5-figure monthly turnover) or at a practitioner consult — whichever first | Register on the GST portal (Maharashtra), add the GSTIN to the footer identity block, show tax-inclusive prices on /pricing, start filing returns |
| TDS on referral payouts (Sec 194H/194R, ~2%, ₹20k/FY threshold post-Oct-2024) | Any single referrer approaches ~₹18k earnings in a financial year | PAN is already collected at bank-connect, so this is accounting work only: compute + deduct + quarterly TDS returns (Form 26Q) |
| Incorporation ( Pvt Ltd / OPC / LLP) | Material revenue, hiring, or liability exposure that a sole proprietorship should not carry | Incorporate; update the operator name in Footer, Terms §1, /grievance officer line; update bank/payout accounts |
| Cookie consent banner | The day ANY analytics or advertising tool is added to the site | Ship the consent banner in the same change; update Privacy §4; keep the "no analytics" claim true otherwise |
| Self-serve export/delete endpoints | Real user volume makes email-only requests heavy | Build the settings UI calling an authenticated RPC; keep the 30-day SLA honest meanwhile |
| Trademark filing ("Jobkar") | Brand spend begins (paid ads, influencer push) | File TM-A for the wordmark in classes 35/42 via a practitioner |
| Breach runbook (beyond the one-pager) | First real incident, or a practitioner consult | Contact list, regulator notification template, user-notification template, log-preservation steps |
| DPAs with processors | Supabase/Vercel/Razorpay plan changes or a practitioner asks | Store the signed/standard DPAs in this docs folder |

Standing rules that keep this list short: paywalls and trust claims stay
server-side enforced and smoke-tested (see scripts/smoke.mjs); numbers shown
to users must come from the database, never be invented; the grievance SLA
(48h ack / 15 days) in /grievance must stay in sync with how the support
inbox is actually worked.
