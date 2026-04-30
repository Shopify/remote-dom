---
'@remote-dom/signals': patch
'@remote-dom/core': patch
---

Guard receivers against late mutations on detached nodes

`RemoteReceiver` and `SignalRemoteReceiver` now drop `insertChild`, `removeChild`, `updateProperty`, and `updateText` mutations whose target node is no longer in the receiver's `attached` map, instead of throwing a `TypeError` while dereferencing the missing node.

This race surfaces in production as unhandled promise rejections such as `TypeError: undefined is not an object (evaluating 'x.properties')` (Safari) / `TypeError: Cannot read properties of undefined (reading 'properties')` (V8) when a remote sender dispatches a mutation for a node whose host-side state has just been removed (for example, a `removeChild` for an ancestor was processed earlier in the same batch, or arrived first from a separate batched payload).

PR #533 previously added a similar guard to `removeChild` for the case where the _child slot_ at a given index was empty, but did not handle the case where the _parent itself_ was missing, and did not touch `updateProperty` or `updateText`. This change applies the same defensive pattern uniformly to every connection callback that dereferences `attached.get(id)`.

Late mutations targeting a detached subtree are by definition no-ops — there is nothing left to mutate.
