---
'@remote-dom/core': minor
---

Improved `RemoteMutationObserver` to support automatic emptying and observing multiple nodes

If you are observing a multi-node list — such as a `DocumentFragment` or `<template>` element — you can now provide a custom `id` option when observing each node. This allows you to treat the observer as a kind of "virtual root" for a list of nodes, similar to the role the `DocumentFragment` plays in the DOM. You are responsible for giving each node a unique ID, and this class will take care of correctly attaching that node to the root of the remote tree.

```js
const observer = new RemoteMutationObserver(connection);

let id = 0;
for (const child of documentFragment.childNodes) {
  observer.observe(child, {
    id: `DocumentFragment:${id++}`,
  });
}
```

You can also now provide an `empty` option to `RemoteMutationObserver.disconnect()` in order to clear out children in remote environment:

```js
const observer = new RemoteMutationObserver(connection);

observer.observe(container);

observer.disconnect({empty: true});
```
