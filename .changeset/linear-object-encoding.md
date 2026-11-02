---
'@remote-ui/rpc': patch
---

Encode and decode plain objects in linear time instead of quadratic time in their number of keys, using `Object.fromEntries` (ES2019). The encoded format is unchanged.
