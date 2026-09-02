---
'@remote-dom/polyfill': patch
---

Queue custom-element reactions so compound tree and attribute mutations commit their local state and Remote DOM hooks before callbacks run. Drain nested reactions in FIFO order, and finish the queue before rethrowing the first callback error.
