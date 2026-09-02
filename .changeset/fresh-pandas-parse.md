---
'@remote-dom/polyfill': patch
---

Preserve character references and literal ampersands when parsing `innerHTML`, decode attribute references without double-escaping, handle nested `innerHTML` parsing from synchronous callbacks, and handle HTML void elements without nesting following content or serializing closing tags.
