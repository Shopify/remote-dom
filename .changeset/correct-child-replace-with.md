---
'@remote-dom/polyfill': patch
---

Make `ChildNode.replaceWith()`, `before()`, and `after()` validate all arguments before changing existing trees, preserve sibling argument order, and commit each operation before custom-element reactions run.
