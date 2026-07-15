---
'@remote-dom/polyfill': minor
---

Implement `getElementById()` on `Document` and `DocumentFragment`

The polyfill gave `ParentNode` `querySelector()` and `querySelectorAll()`, but the `NonElementParentNode.getElementById()` lookup was missing, so `document.getElementById(id)` threw `document.getElementById is not a function` inside a remote environment. Because host code is typically type-checked against `lib.dom`, which does declare the method, this failure was invisible to static checks and only surfaced at runtime.

The lookup returns the first element in tree order whose `id` attribute matches, and matches that attribute literally rather than delegating to `querySelector('#' + id)` — an id is a string, not a selector, and the selector tokenizer has no escape handling, so an id containing `.`, `:`, `[`, or whitespace would otherwise parse as a different selector.
