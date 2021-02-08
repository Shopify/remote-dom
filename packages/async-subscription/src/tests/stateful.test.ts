import {makeStatefulSubscribable} from '../stateful';
import type {RemoteSubscribable} from '../types';

jest.mock('@remote-ui/rpc', () => ({
  retain: jest.fn(),
  release: jest.fn(),
}));

const {retain, release} = jest.requireMock('@remote-ui/rpc') as {
  retain: jest.Mock;
  release: jest.Mock;
};

describe('makeStatefulSubscribable()', () => {
  beforeEach(() => {
    release.mockReset();
    retain.mockReset();
  });

  it('retains the subscription', () => {
    const subscription = createRemoteSubscribable(123);
    makeStatefulSubscribable(subscription);
    expect(retain).toHaveBeenCalledWith(subscription);
  });

  it('keeps track of the current value', async () => {
    const subscription = createRemoteSubscribable('abc');
    const statefulSubscription = makeStatefulSubscribable(subscription);
    await subscription.resolve();

    const newValue = 'xyz';
    subscription.update(newValue);

    expect(statefulSubscription.current).toBe(newValue);
  });

  it('calls subscribers with new values', async () => {
    const subscription = createRemoteSubscribable('abc');
    const statefulSubscription = makeStatefulSubscribable(subscription);
    await subscription.resolve();

    const subscriber = jest.fn();
    statefulSubscription.subscribe(subscriber);

    const newValue = 'xyz';
    subscription.update(newValue);

    expect(subscriber).toHaveBeenCalledWith(newValue);
  });

  it('updates the current value when the value has changed before subscription', async () => {
    const subscription = createRemoteSubscribable('abc');
    const statefulSubscription = makeStatefulSubscribable(subscription);
    const subscriber = jest.fn();
    statefulSubscription.subscribe(subscriber);

    const newValue = 'xyz';
    subscription.update(newValue);

    await subscription.resolve();

    expect(subscriber).toHaveBeenCalledWith(newValue);
    expect(statefulSubscription.current).toBe(newValue);
  });

  it('releases the subscription when stopped', async () => {
    const subscription = createRemoteSubscribable('abc');
    const statefulSubscription = makeStatefulSubscribable(subscription);

    await subscription.resolve();
    await statefulSubscription.destroy();

    expect(release).toHaveBeenCalledWith(subscription);
  });

  it('unsubscribes from the subscription on stop, and does not apply any updates', async () => {
    const subscription = createRemoteSubscribable('abc');
    const statefulSubscription = makeStatefulSubscribable(subscription);
    const subscriber = jest.fn();
    statefulSubscription.subscribe(subscriber);

    const newValue = 'xyz';
    subscription.update(newValue);

    statefulSubscription.destroy();
    await subscription.resolve();

    expect(release).toHaveBeenCalledWith(subscription);
    expect(subscriber).not.toHaveBeenCalled();
    expect(statefulSubscription.current).not.toBe(newValue);
  });
});

function createRemoteSubscribable<T>(
  initial: T,
): RemoteSubscribable<T> & {update(value: T): void; resolve(): Promise<void>} {
  let current = initial;
  let resolved = false;
  const subscribers = new Set<
    Parameters<RemoteSubscribable<T>['subscribe']>[0]
  >();
  const promises = new Set<Promise<void>>();

  return {
    initial,
    update(value) {
      current = value;

      if (!resolved) return;

      for (const subscriber of subscribers) {
        subscriber(value);
      }
    },
    async resolve() {
      await Promise.all([...promises]);
      resolved = true;
    },
    subscribe(subscriber) {
      subscribers.add(subscriber);
      const result = Promise.resolve().then(
        () => [jest.fn(() => subscribers.delete(subscriber)), current] as any,
      );

      promises.add(result);

      return result;
    },
  };
}
