---
name: seo-search-console
description: Google Search Console verification CONFIRMED 2026-09-24 (HTML file
  must stay in public/ permanently — Google rechecks); open next step = add
  sitemap.xml (doesn't exist yet, offered twice)
metadata:
  node_type: memory
  type: project
  originSessionId: sess_3dd4ee5a-f1a3-4681-8881-37ffc9fd0908
---

2026-09-24: Google Search Console HTML-file verification is DONE and user-confirmed. Added `google11a626f18d4adfec.html` to the website repo's `public/` folder, commit `09f785b`, pushed to devanshbhosale/portfolio, Vercel-deployed (~45s), and `https://jobkarbe.vercel.app/google11a626f18d4adfec.html` returns 200 with the exact `google-site-verification:` line. User then confirmed GSC verification passed.

- **DO NOT DELETE the file — ever.** User asked post-verification whether it could now be removed; I advised no: Google rechecks the file periodically, and if it's missing at recheck time the property loses verified-owner status (silently dropping sitemaps, indexing reports, access). It's a one-line static file that ships with every deploy, so keeping it costs nothing. If a future session sees cleanup pressure on this file, it must stay.
- **Public visibility is known and accepted (2026-09-24):** user then asked whether any visitor can see the file — yes, it's fully public, and that's by design. The token is NOT a credential (can't log in, access GSC, or tamper; it only proves ownership to Google's crawler, and every site using this method exposes the same). If the user's visibility concern resurfaces, the only zero-trace alternative is a DNS TXT record on jobkarbe.in (requires DNS-panel access; no security benefit) — don't re-remove the file over it.
- Middleware matcher (`/`, `/jobs/:path*`, `/dashboard/:path*`, `/profile`, `/login`) does not interfere with static public files.
- **Open next step (offered twice, not yet requested):** the site has NO sitemap.xml — offered to add one so Google indexes the job pages faster. If user agrees, create `app/sitemap.ts` (Next.js convention) and submit `https://jobkarbe.vercel.app/sitemap.xml` in GSC.
- Context: this kicks off the SEO/indexing workstream after the [[project-brand-rename-jobkarbe]] (site is fully live with real payments, marketing green-lit).
