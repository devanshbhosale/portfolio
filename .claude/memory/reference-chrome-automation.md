---
name: reference-chrome-automation
description: Reliable recipe for launching and driving Chrome for GUI
  verification on this Windows machine — app-launcher name lookups fail,
  screenshots are not model-visible
metadata:
  node_type: memory
  type: reference
  originSessionId: sess_d81e5b9c-b557-405f-880f-8c496c9fc2fc
---

How to do browser GUI verification on this machine (established 2026-09-03 during the locked-cards check):

- **App launcher fails by name**: `open_application` with "Google Chrome", "Microsoft Edge", or a Chrome bundle_id all error ("could not launch" / "requires an explicit application name"). Working path: Bash `cmd //c start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window <URL>`, then find the process via `list_apps` (Chrome shows up as its window title, e.g. "Browse Jobs | Jobkar - Google Chrome").
- **Activation needs the exact window title + pid**: `open_application(activate=true, {name: <window title from list_apps>, pid})` — passing the product name with the pid errors with an identity mismatch.
- **Element clicks (AXPress) work reliably**, even on a background window; coordinate clicks fail with "dispatch app/window identity does not match frame" until the window is activated.
- **Omnibox typing doesn't work**: `set_value` on the address bar fails InputValidation and `type` returns `action_unsupported` — navigate by clicking in-page links (e.g. the site logo → `/`) instead.
- **Screenshots are NOT model-visible here**: `get_app_state(include_screenshot=true)` returns "This CUA raster is not visible in this request" — don't plan on pixel-reading. Verify visuals via the a11y tree (element names/labels expose rendered text like "Unlock from ₹99"), SSR-HTML greps over `curl` output, and dev-server log scans.
