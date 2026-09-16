---
'@remote-dom/core': major
---

Add explicit element configuration to `DOMRemoteReceiver`.

Configure `elements` with an array of element names, or a map specifying each element's `properties`, `attributes`, `eventListeners`, and `methods`. An array configures element creation only. Without an `elements` configuration, the receiver accepts text and comments. Root method calls require a custom `call` callback.

For `RemoteReceiverElement`, configure the static `elements` property in a host-side subclass. DOM receiver consumers must migrate to this configuration when upgrading. Data-only receivers are unchanged.
