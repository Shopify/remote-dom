---
'@remote-dom/core': minor
---

Add optional per-element member configuration and `blockedProperties` to `DOMRemoteReceiver`.

Use `elements` with an array of element names, or a map specifying each element's `properties`, `attributes`, `events`, and `methods`. Property keys map to objects with optional `type` and `attribute` fields. The `type` field validates non-nullish property-channel values (no coercion); `attribute` authorizes corresponding attributes (defaults `true` for kebab-case, string for named alias, `false` for none). Attribute values remain strings (or nullish for removal), not parsed. Events use raw DOM names (e.g., `click`, not `onClick`).

Existing element-name arrays retain ordinary member handling; omitted member lists use the defaults. Supplied empty maps or arrays deny that channel. `blockedProperties` adds host-specific property and attribute exclusions.

`RemoteReceiverElement` supports the same configuration through static properties on a host-side subclass. The existing `call` callback remains available for custom method dispatch. Data-only receivers are unchanged.
