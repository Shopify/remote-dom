---
'@remote-dom/polyfill': patch
---

Fix `ChildNode.replaceWith()` throwing instead of replacing the node

`replaceWith()` passed its arguments to `replaceChild()` in the wrong order — `replaceChild(newChild, oldChild)` was called as `parent.replaceChild(this, node)`, naming the incoming node as the child to replace. Since that node is usually fresh and has no parent, the reference check rejected it and every call threw `reference node is not a child of this parent`. It also read the following sibling off the incoming node rather than off `this`, so the remaining arguments had no correct insertion point to anchor to.

The method now removes `this` and inserts the given nodes at its position, in argument order, anchored on the first following sibling that is not itself being moved. Strings become text nodes, calling it with no arguments removes the node (matching `remove()`), and a node with no parent is still left alone.
