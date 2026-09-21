---
'@remote-dom/core': minor
---

Add optional per-element member configuration and `blockedProperties` to `DOMRemoteReceiver`.

This release also fixes security vulnerabilities.

Use `elements` with an array of element names, or a map specifying each element's `properties`, `attributes`, `events`, and `methods`. Property keys map to objects with optional `type` and `attribute` fields. The `type` field validates non-nullish property-channel values (no coercion); `attribute` authorizes corresponding attributes (defaults `true` for kebab-case, string for named alias, `false` for none). Attribute values must be strings (or nullish for removal); they are not parsed according to property types. Events use raw DOM names (e.g., `click`, not `onClick`).

### Default behavior

- A supplied `elements` array or map restricts element names, including nested children. Omitting `elements` leaves names unrestricted; an empty array or map accepts only text and comments.
- Property and attribute names `innerHTML`, `outerHTML`, `srcdoc`, `__proto__`, `constructor`, `prototype`, `is`, and names beginning with `on` are excluded case-insensitively. Use the event-listener channel for event callbacks.
- Assignments to base DOM methods are excluded. Native `<a>` and `<area>` elements also exclude writes to the `protocol` property; update their complete `href` instead.
- URL checks apply to `href`, `xlink:href`, `src`, `action`, `formAction`, `codebase`, `background`, `poster`, and native `<object>.data`. They reject `javascript:`, `vbscript:`, and `data:` URLs other than AVIF, BMP, GIF, JPEG, PNG, and WebP image media types. Native URL properties require strings or nullish values rather than object coercion.
- Default method dispatch supports custom-element methods and native `focus`/`blur`, but excludes other native or inherited DOM methods. Root calls require a host `call` callback. A `methods` list can narrow default dispatch, not override its exclusions.
- Text updates apply only to text and comment nodes.

Explicit member definitions do not override these default checks. `blockedProperties` adds exclusions rather than replacing the defaults.

Existing element-name arrays retain ordinary member handling; omitted member definitions use the defaults. Empty `properties` or `events` maps and empty `methods` lists deny those channels. The `attributes` list adds attribute-only names to those authorized by property definitions; without property definitions, an empty `attributes` list denies attributes.

`RemoteReceiverElement` supports the same configuration through static properties on a host-side subclass. The existing `call` callback remains available for custom method dispatch. Data-only receivers are unchanged.
