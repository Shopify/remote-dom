---
'@remote-dom/core': minor
---

Add optional per-element member configuration and `blockedProperties` to `DOMRemoteReceiver`.

Use `elements` with an array of element names, or a map specifying each element's `properties`, `attributes`, `eventListeners`, and `methods`. Existing name arrays retain ordinary member handling; omitted member lists use the defaults. `blockedProperties` adds host-specific property and attribute exclusions.

`RemoteReceiverElement` supports the same configuration through static properties on a host-side subclass. The existing `call` callback remains available for custom method dispatch. Data-only receivers are unchanged.
