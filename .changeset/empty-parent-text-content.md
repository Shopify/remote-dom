---
'@remote-dom/polyfill': patch
---

Clear parent children without creating an empty text node when assigning an empty `textContent` value, and finish the complete replacement before running custom-element reactions.
