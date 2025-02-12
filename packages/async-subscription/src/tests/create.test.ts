import {createRemoteSubscribable} from '../create';
import type {SyncSubscribable} from '../types';

jest.mock('@remote-ui/rpc', () => ({
  retain: jest.fn(),
  release: jest.fn(),
}));

const {retain, release} = jest.requireMock('@remote-ui/rpc') as {
  retain: jest.Mock;
  release: jest.Mock;
};

describe('createRemoteSubscribable()', () => {
  beforeEach(() => {
    release.mockReset();
    retain.mockReset();
  });

  it('provides the initial value synchronously', () => {
    const initial = 123;
    const subscription = createSyncSubscribable(initial);
    expect(createRemoteSubscribable(subscription)).toHaveProperty(
      'initial',
      initial,
    );
  });

  it('retains subscriptions on subscribe', async () => {
    const subscription = createSyncSubscribable('abc');
    const subscriber = jest.fn();
    await createRemoteSubscribable(subscription).subscribe(subscriber);
    expect(retain).toHaveBeenCalledWith(subscriber);
  });

  it('calls a subscription when the value changes', async () => {
    const subscription = createSyncSubscribable('abc');
    const subscriber = jest.fn();

    await createRemoteSubscribable(subscription).subscribe(subscriber);

    const newValue = 'xyz';
    subscription.update(newValue);

    expect(subscriber).toHaveBeenCalledWith(newValue);
  });

  it('returns a teardown function that releases the subscription and prevents future updates', async () => {
    const subscription = createSyncSubscribable('abc');
    const subscriber = jest.fn();
    const [teardown] = await createRemoteSubscribable(subscription).subscribe(
      subscriber,
    );

    teardown();

    expect(release).toHaveBeenCalledWith(subscriber);

    subscription.update('xyz');

    expect(subscriber).not.toHaveBeenCalled();
  });

  it('returns the current value when the subscription is made', async () => {
    const subscription = createSyncSubscribable('abc');
    const newValue = 'xyz';
    subscription.update(newValue);

    const [, value] = await createRemoteSubscribable(subscription).subscribe(
      jest.fn(),
    );

    expect(value).toBe(newValue);
  });

  it('allows to catch async errors in the subscriber callback', async () => {
    const subscription = createSyncSubscribable('abc');
    let subscriberPromise: Promise<any>;

    const remoteSubscription = createRemoteSubscribable({
      current: subscription.current,
      subscribe: (subscriber) => {
        return subscription.subscribe(async (value) => {
          subscriberPromise = subscriber(value) as Promise<any>;
        });
      },
    });

    remoteSubscription.subscribe(async () => {
      throw new Error('test');
    });

    subscription.update('xyz');

    await expect(subscriberPromise!).rejects.toThrow('test');
  });
});

function createSyncSubscribable<T>(
  initial: T,
): SyncSubscribable<T> & {update(value: T): void} {
  let current = initial;
  const subscribers = new Set<
    Parameters<SyncSubscribable<T>['subscribe']>[0]
  >();

  return {
    get current() {
      return current;
    },
    update(value) {
      current = value;

      for (const subscriber of subscribers) {
        subscriber(value);
      }
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
  };
}
