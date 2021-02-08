# `@remote-ui/async-subscription`

This library provides a small, safe implementation of subscriptions that works when all function calls must be asynchronous.

## Installation

Using `yarn`:

```
yarn add @remote-ui/async-subscription
```

or, using `npm`:

```
npm install @remote-ui/async-subscription --save
```

## Usage

This library considers three different types of subscriptions:

1. A synchronous subscription (`SyncSubscribable`), which allows synchronous access to the current value with the `current` property, and allows registering and registering a callback synchronously with `subscribe()`.
1. A remote subscription (`RemoteSubscribable`), which provides an `initial` value synchronously, and an asynchronous `subscribe()` function that that can register for all changes to their subscribed value, as documented below.
1. A stateful remote subscription (`StatefulRemoteSubscribable`), which is based on `RemoteSubscribable`, but presents the API of a `SyncSubscribable`.

When providing a subscription to a remote-ui container, you will generally need the host to convert its `SyncSubscribable` into an `RemoteSubscribable`, which you can then safely pass to the remote context. Once there, you can use it directly, or wrap it as a `StatefulRemoteSubscribable` to continuously provide the most recent value synchronously (rather than merely relying on the initial value, and asynchronously updating it for each subscriber).

This library provides utilities to do both parts of this job.

### `createRemoteSubscribable()`

This function accepts a synchronous subscription, and returns its asynchronous version.

```ts
import {createRemoteSubscribable} from '@remote-ui/async-subscription';

const input = document.createElement('input');

// We will create an async subscription for an HTML input’s value. We’ll provide
// the input’s initial value, and add an event listener for updates.
const subscription = createRemoteSubscribable<string>({
  get current() {
    return input.value;
  },
  subscribe(subscriber) {
    function listener(event: Event) {
      subscriber(event.currentTarget.value);
    }

    input.addEventListener('input', listener);

    return () => {
      input.removeEventListener('input', listener);
    };
  },
});
```

This subscription is now “safe” to use in a remote context. Safety here means that the remote context will always be updated as early as possible with the actual current value of the subscription. It does so by returning the current value every time the remote context calls `subscribe()`, which the remote context can then check against its current value. The async subscription will also [`retain`](../rpc#retain) the subscription, and [`release`](../rpc#release) it when unsubscribed.

## `makeStatefulSubscribable()`

This function accepts a remote subscription, and returns a “stateful” remote subscription. This type of subscription will immediately subscribe (and update the current value, if it ends up being different after the initial subscription promise resolves), and will continuously reflect the most recent value it finds in its `getCurrentValue()` method. It also retains the subscription.

The `subscribe()` method behaves as if it were synchronous (returning a function that can be used to unsubscribe), but this does not remove the “core” listener on the subscription that maintains the stateful value. To permanently destroy the statefulness of the subscription, you can call the `destroy()` method on the resulting subscription.

```ts
import {
  makeStatefulSubscribable,
  RemoteSubscribable,
} from '@remote-ui/async-subscription';

// In the remote context...

function receiveSubscription<T>(subscription: RemoteSubscribable<T>) {
  const statefulSubscription = makeStatefulSubscribable(subscription);

  const unsubscribe = statefulSubscription.subscribe((value) => {
    console.log('New value');
  });

  // We’ll unsubscribe when we get a message to do so
  addEventListener('message', ({data}) => {
    if (data.unsubscribe) {
      unsubscribe();
    }
  });
}
```
