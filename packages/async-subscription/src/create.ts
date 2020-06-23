import {retain, release} from '@remote-ui/rpc';
import type {SyncSubscription, AsyncSubscription} from './types';

export function createAsyncSubscription<T>(
  subscription: SyncSubscription<T>,
): AsyncSubscription<T> {
  const initial = subscription.getCurrentValue();

  return {
    initial,
    subscribe(subscriber) {
      retain(subscriber);

      const unsubscribe = subscription.subscribe(
        (value = subscription.getCurrentValue()) => {
          subscriber(value);
        },
      );

      const teardown = () => {
        unsubscribe();
        release(subscriber);
      };

      return [teardown, subscription.getCurrentValue()];
    },
  };
}
