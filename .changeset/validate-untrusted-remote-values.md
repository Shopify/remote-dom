---
'@remote-dom/core': patch
'@remote-dom/signals': patch
'@remote-dom/preact': patch
'@remote-dom/react': patch
---

Validate values received from the remote environment before storing or rendering them.

`RemoteReceiver` and `SignalRemoteReceiver` now normalize text node content and attribute values to strings (nullish attribute updates remove the attribute), reject property values containing objects that would be mistaken by a UI framework for one of its own virtual nodes, require event listeners to be functions, and reject `__proto__` as a property name. The `@remote-dom/preact` and `@remote-dom/react` host renderers additionally ignore non-string attributes and never pass remote-controlled `children`, `ref`, `key`, or `dangerouslySetInnerHTML` props to host components. `RemoteElement.updateRemoteAttribute()` now sends the same string it stores locally.

The new validation helpers are exported from `@remote-dom/core/receivers` for use by custom receivers.
