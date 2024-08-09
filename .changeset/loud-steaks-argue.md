---
'@remote-dom/polyfill': patch
---

Fixes `hooks.addEventListener()` being called even when `EventTarget.addEventListener()` rejects a duplicate listener registration
