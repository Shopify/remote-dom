---
'@remote-dom/core': major
---

Require host-owned element and capability allowlists in `DOMRemoteReceiver`.

The receiver now accepts only text and comments by default. Configure `elements` with an array of allowed names (creation only), or a map declaring each element's allowed `properties`, `attributes`, `eventListeners`, and `methods`. Validation covers nested insertions and subsequent updates. Default method calls require an explicit method permission, and calls on the root are denied. A custom `call` callback remains an explicit host-controlled override.

`RemoteReceiverElement` uses the same restrictions; configure its static `elements` policy in a host-side subclass. Existing DOM receiver users must migrate to explicit policies. Remote-side element declarations are not sufficient. Data-only receivers are unchanged.
