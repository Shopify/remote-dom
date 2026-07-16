---
'@remote-dom/polyfill': patch
---

Fix `insertBefore()` leaving the previous sibling pointing past the inserted node

`ParentNode.insertBefore()` relinked the new child's `NEXT`/`PREV` and the reference node's `PREV`, but only repointed the previous sibling's `NEXT` when the reference node was the first child. Inserting before any _later_ child therefore left the forward sibling chain skipping the new node.

That chain is what `querySelector()`, `querySelectorAll()`, and `firstChild`/`nextSibling` traversal walk, so an affected node was unreachable from every selector query and sibling walk — while `childNodes`, `parentNode`, `previousSibling`, and the host mirror all still reported it as present. The node rendered correctly on the host and was invisible to the remote environment's own lookups, with no error raised. `replaceChild()`, `prepend()` (of more than one node), and `ChildNode.after()` all route through the same branch and were affected too.

This is easy to hit whenever a framework renders ahead of existing content — for example inserting content before an already-appended `<style>` element — where it silently breaks code as ordinary as `document.querySelector('#my-modal').showModal()`.
