---
'@remote-dom/core': minor
---

Flush `BatchingRemoteConnection` mutations on a microtask by default

The default `batch` function used by `BatchingRemoteConnection` now schedules flushes on a microtask (via `queueMicrotask`, falling back to `Promise.resolve().then(...)`) instead of a macrotask via `MessageChannel`/`setTimeout`.

This ensures that DOM mutations made in the remote environment are delivered to the host before any `await`ed RPC response resolves, avoiding a class of bugs where the host sees an RPC result before the element updates that produced it (for example, a `perform()` callback setting an error on a field, only to have the host run its post-`await` logic before that error mutation arrives).

If you were relying on the previous macrotask behavior, you can restore it by passing a custom `batch` option, e.g.:

```ts
new BatchingRemoteConnection(connection, {
  batch: (flush) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => flush();
    channel.port2.postMessage(null);
  },
});
```
