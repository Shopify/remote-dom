---
'@remote-dom/polyfill': patch
---

Refactored `getElementById` and `getElementsByTagName` to delegate to the shared selector engine (`querySelector`/`querySelectorAll`) instead of maintaining independent tree-walk implementations. The selector functions now accept a pre-parsed `Matcher[]` in addition to string selectors, and `MatcherType`, `Combinator`, `Matcher`, and `Part` are now exported from `selectors.ts`. This eliminates duplicate traversal code, avoids CSS-escaping issues for ids containing special characters, and fixes case-insensitive HTML tag-name matching in the selector engine.
