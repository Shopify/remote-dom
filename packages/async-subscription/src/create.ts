import {retain, release} from '@remote-ui/rpc';

import type {SyncSubscribable, RemoteSubscribable} from './types';

export function createRemoteSubscribable<T>(
  subscription: SyncSubscribable<T>,
): RemoteSubscribable<T> {
  const initial = subscription.current;

  return {
    initial,
    subscribe(subscriber) {
      retain(subscriber);

      const unsubscribe = subscription.subscribe(
        (value = subscription.current) => {
          return subscriber(value);
        },
      );

      const teardown = () => {
        unsubscribe();
        release(subscriber);
      };

      return [teardown, subscription.current];
    },
  };
}
