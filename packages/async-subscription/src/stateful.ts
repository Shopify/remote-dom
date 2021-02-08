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

  const subscribers = new Set<Subscriber<T>>();

  const subscriptionResult = Promise.resolve<RemoteSubscribeResult<T>>(
    subscription.subscribe(listener),
  ).then((result) => {
    listener(result[1]);
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
    if (!listening || current === value) return;

    current = value;

    for (const subscriber of subscribers) {
      subscriber(current);
    }
  }
}
