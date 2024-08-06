---
'@remote-dom/polyfill': patch
---

Bug fixes to event dispatching

- Listeners on the target are now called during both the capture and bubble phases.
- `stopPropagation` now respected.
- `stopImmediatePropagation` now also stops regular propagation.
