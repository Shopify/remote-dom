---
'@remote-dom/core': minor
'@remote-dom/polyfill': minor
'@remote-dom/preact': minor
'@remote-dom/react': minor
'@remote-dom/signals': minor
---

Add a `adaptToLegacyRemoteChannel` helper that adapts a Remote DOM `RemoteConnection` object into a `remote-ui` `RemoteChannel`.

It allows to use a Remote DOM receiver class on the host, even if the remote environment is using `remote-ui`.
