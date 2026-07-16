---
'@remote-dom/polyfill': minor
---

Add `getElementsByTagName()` to `Document` and `Element`.

The lookup supports common HTML, non-HTML, and wildcard descendant searches. Canonical WPT coverage records the supported matching behavior while deferring live `HTMLCollection` semantics and qualified-name edge cases.
