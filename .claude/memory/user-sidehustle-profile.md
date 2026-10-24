---
name: user-sidehustle-profile
description: User is building Jobkar as a private, money-generating side hustle;
  cost- and code-protection-conscious
metadata:
  node_type: memory
  type: user
  originSessionId: sess_6c20739e-3d54-4f65-bbfe-ccf1be42136e
---

The user is building Jobkar (job portal) as a **private side hustle intended to generate money**. Key traits:
- Will keep the code in a **private GitHub repo** to protect it (GitHub private repos are free — reassure them on this point).
- Cost-conscious: expects ~₹0/month infra (free tiers), accepts ~2% per-sale Razorpay fees, treats paid upgrades (Supabase Pro $25/mo, Vercel Pro $20/mo) as only-if-outgrown.
- Not in a hurry — explicitly prioritizes production-grade quality and correctness over speed ("we r not in hurry so we want quality production grade website and dashboard+perfect agent"). See [[feedback-quality-first]].
- Works through plan mode carefully: repeatedly asked for deeper gap audits before approving a plan ([[project-jobkar-rebuild]]).
- **Environment**: Windows (OneDrive path), Windows Defender flagged ngrok as threat → alternatives: VS Code port forwarding, Cloudflare tunnel (`npx cloudflared tunnel`), or deploy to Vercel first for webhook URL.
