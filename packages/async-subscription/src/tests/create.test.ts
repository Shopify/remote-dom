import {createAsyncSubscription} from '../create';
import type {SyncSubscription} from '../types';

jest.mock('@remote-ui/rpc', () => ({
  retain: jest.fn(),
  release: jest.fn(),
}));

const {retain, release} = jest.requireMock('@remote-ui/rpc') as {
  retain: jest.Mock;
  release: jest.Mock;
};

describe('createAsyncSubscription()', () => {
  beforeEach(() => {
    release.mockReset();
    retain.mockReset();
  });

  it('provides the initial value synchronously', () => {
    const initial = 123;
    const subscription = createSyncSubscription(initial);
    expect(createAsyncSubscription(subscription)).toHaveProperty(
      'initial',
      initial,
    );
  });

  it('retains subscriptions on subscribe', async () => {
    const subscription = createSyncSubscription('abc');
    const subscriber = jest.fn();
    await createAsyncSubscription(subscription).subscribe(subscriber);
    expect(retain).toHaveBeenCalledWith(subscriber);
  });

  it('calls a subscription when the value changes', async () => {
    const subscription = createSyncSubscription('abc');
    const subscriber = jest.fn();

    await createAsyncSubscription(subscription).subscribe(subscriber);

    const newValue = 'xyz';
    subscription.update(newValue);

    expect(subscriber).toHaveBeenCalledWith(newValue);
  });

  it('returns a teardown function that releases the subscription and prevents future updates', async () => {
    const subscription = createSyncSubscription('abc');
    const subscriber = jest.fn();
    const [teardown] = await createAsyncSubscription(subscription).subscribe(
      subscriber,
    );

    teardown();

    expect(release).toHaveBeenCalledWith(subscriber);

    subscription.update('xyz');

    expect(subscriber).not.toHaveBeenCalled();
  });

  it('returns the current value when the subscription is made', async () => {
    const subscription = createSyncSubscription('abc');
    const newValue = 'xyz';
    subscription.update(newValue);

    const [, value] = await createAsyncSubscription(subscription).subscribe(
      jest.fn(),
    );

    expect(value).toBe(newValue);
  });
});

function createSyncSubscription<T>(
  initial: T,
): SyncSubscription<T> & {update(value: T): void} {
  let current = initial;
  const subscribers = new Set<
    Parameters<SyncSubscription<T>['subscribe']>[0]
  >();

  return {
    getCurrentValue: () => current,
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
