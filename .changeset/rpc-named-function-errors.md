---
'@remote-ui/rpc': patch
---

Throw exported `RemoteFunctionReleasedError` / `RemoteFunctionRevokedError` instead of a generic `Error` when calling a function proxy that was already released or revoked, so consumers can use `instanceof` (or the stable `error.name`) instead of matching the message string. The error messages are unchanged; this is a diagnostics-only change with no behavioral difference.
