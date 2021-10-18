import {retain, release} from '@remote-ui/rpc';

import type {
  Subscriber,
  RemoteSubscribable,
  RemoteSubscribeResult,
  StatefulRemoteSubscribable,
} from './types';

export function makeStatefulSubscribable<T>(
  subscription: RemoteSubscribable<T>,
): StatefulRemoteSubscribable<T> {
  // We retain because it will automatically retain any functions we get from
  // calling functions on this object, which will automatically manage the memory
  // for unsubscribe callbacks received from subscription.subscribe().
  retain(subscription);

  let current = subscription.initial;
  let listening = true;
  let hasUpdated = false;

  const subscribers = new Set<Subscriber<T>>();

  const subscriptionResult = Promise.resolve<RemoteSubscribeResult<T>>(
    subscription.subscribe(listener),
  ).then((result) => {
    // Because of the async nature of receiving the result, we may have
    // already started receiving updates from the subscriber before this
    // code has been reached. In that case, we do not want to apply the
    // value we received on subscribing, because it is already out of date.
    if (!hasUpdated) listener(result[1]);
    return result;
  });

  return {
    get current() {
      return current;
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);

      return () => {
        subscribers.delete(subscriber);
      };
    },
    async destroy() {
      listening = false;
      subscribers.clear();

      const [unsubscribe] = await subscriptionResult;
      unsubscribe();
      release(subscription);
    },
  };

  function listener(value: T) {
    hasUpdated = true;

    if (!listening || current === value) return;

    current = value;

    for (const subscriber of subscribers) {
      subscriber(current);
    }
  }
}
