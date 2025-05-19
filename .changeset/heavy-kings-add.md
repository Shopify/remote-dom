---
'@remote-ui/rpc': patch
---

An endpoint will trigger an uncaught promise rejection with a `MissingResolverError` error when it receives messages to call a function that is no longer registered.
