---
'@remote-dom/polyfill': patch
---

Validate tree insertions and replacements before changing node links so invalid ancestor, template-content cycle, and reference-node mutations preserve the existing trees. Treat inserting a node before itself as a no-op and safely replace a child with its next sibling.
