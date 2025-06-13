---
'@remote-ui/rpc': patch
---

Add early return in message listener as a safe guard to make sure we don't run into exceptions processing messages in terminated endpoints.
