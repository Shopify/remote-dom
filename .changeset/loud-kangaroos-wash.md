---
'@remote-ui/core': minor
'@remote-ui/htm': minor
'@remote-ui/mini-react': minor
'@remote-ui/react': minor
'@remote-ui/rpc': minor
'@remote-ui/testing': minor
'@remote-ui/traversal': minor
'@remote-ui/vue': minor
---

Added a number of methods that align more closely with the corresponding DOM API, and deprecated a few existing methods with overlapping functionality:

- `RemoteParent.appendChild` is deprecated, with a new `RemoteParent.append` API recommended instead. This new API matches the [`Element.append`](https://developer.mozilla.org/en-US/docs/Web/API/Element/append) DOM API: it allows you to pass multiple children, including strings that are converted to text nodes.
- `RemoteParent.insertChildBefore` is deprecated, with a new `RemoteParent.insertBefore` API recommended instead. This matches the [`Node.insertBefore`](https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore) DOM API, including the fact that the second argument can be null (in which case, the method behaves the same as `append`
- `RemoteParent.replaceChildren` is new, and matches the [`Element.replaceChildren`](https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren) DOM API. It allows passing any number of children/ strings, and those are used to fully replace the existing children.
- `RemoteComponent.remove` and `RemoteText.remove` are new, and match the [`Element.remove`](https://developer.mozilla.org/en-US/docs/Web/API/Element/remove) DOM API.
- `RemoteText.updateText` is deprecated in favor of a new `RemoteText.update` method, which is a little shorter.
