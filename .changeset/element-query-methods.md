---
'@remote-dom/polyfill': minor
---

Add `getElementById()` to `Document` and `DocumentFragment`, with reflected `Element.id` properties. Add `getElementsByTagName()` to `Document` and `Element`, supporting HTML, non-HTML, and wildcard descendant searches. `querySelector` and `querySelectorAll` accept a pre-parsed `Matcher[]` in addition to string selectors, with `MatcherType`, `Combinator`, `Matcher`, and `Part` exported from `selectors.ts`; `getElementById` and `getElementsByTagName` delegate to this shared selector engine instead of independent tree-walk implementations.

Fixed `insertBefore()` leaving the previous sibling pointing at the reference node when inserting before a middle child, causing `NEXT` traversals (including `getElementById`) to skip the inserted subtree even though `childNodes` contained it, and return the inserted child as required by the DOM specification. Fixed `appendChild()` to return the appended child and `NodeList.item()` to return `null` for out-of-range indexes. Fixed case-insensitive HTML tag-name matching in the selector engine so `querySelector('DIV')` now matches `<div>` per the CSS spec. Fixed CSS-escaping issues so `getElementById` matches ids containing special characters (`.`, `:`, `#`, etc.) literally instead of treating them as selector syntax.
