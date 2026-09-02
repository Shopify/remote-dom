---
'@remote-dom/polyfill': patch
---

Fix `ChildNode.replaceWith()`, `before()`, and `after()` to validate arguments before changing existing trees, preserve argument order, and commit each operation before custom-element reactions run.
