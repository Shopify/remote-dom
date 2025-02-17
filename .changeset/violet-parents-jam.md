---
'@remote-ui/async-subscription': patch
---

return subscriber result e.g. to catch errors

```js
function createRemoteSubscribableWrapper(subscription) {
  return createRemoteSubscribable({
    current: subscription.current,
    subscribe: (subscriber) => {
      return subscription.subscribe(async (value) => {
        try {
          await subscriber(value);
        } catch {
          // Catch errors and do something with them
        }
      });
    },
  });
}
```
