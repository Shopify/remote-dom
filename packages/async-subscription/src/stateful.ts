import {retain, release} from '@remote-ui/rpc';
import type {RemoteSubscribable, StatefulRemoteSubscribable} from './types';

export function makeStatefulSubscribable<T>(
  subscription: RemoteSubscribable<T>,
): StatefulRemoteSubscribable<T> {
  // We retain because it will automatically retain any functions we get from
  // calling functions on this object, which will automatically manage the memory
  // for unsubscribe callbacks received from subscription.subscribe().
  retain(subscription);

  const current = subscription.initial;

  return {
    get current() {
      return current;
    },
    subscribe(subscriber) {
      const subscriptionResult = Promise.resolve(
        subscription.subscribe((value) => {
          subscriber(value);
        }),
      ).then((result) => {
        subscriber(result[1]);
        return result;
      });

      return () => subscriptionResult.then(([unsubscribe]) => unsubscribe());
    },
    async destroy() {
      release(subscription);
    },
  };
}
