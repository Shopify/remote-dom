---
'@remote-dom/polyfill': patch
---

Traverse wide and deep trees without overflowing the call stack during text collection, selector queries, and subtree connectivity updates. Prepare insertion snapshots transactionally before committing links, connectivity, hooks, and reactions so traversal failures preserve local and remote tree state. Capture lifecycle reactions in mutation order before emitting reentrant tree-mutation hook effects through a FIFO queue.
