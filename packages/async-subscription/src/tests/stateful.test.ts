import {makeStateful} from '../stateful';
import type {AsyncSubscription} from '../types';

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

  it('retains the subscription', () => {
    const subscription = createAsyncSubscription(123);
    makeStateful(subscription);
    expect(retain).toHaveBeenCalledWith(subscription);
  });

  it('keeps track of the current value', async () => {
    const subscription = createAsyncSubscription('abc');
    const statefulSubscription = makeStateful(subscription);
    await subscription.resolve();

    const newValue = 'xyz';
    subscription.update(newValue);

    expect(statefulSubscription.getCurrentValue()).toBe(newValue);
  });

  it('calls subscribers with new values', async () => {
    const subscription = createAsyncSubscription('abc');
    const statefulSubscription = makeStateful(subscription);
    await subscription.resolve();

    const subscriber = jest.fn();
    statefulSubscription.subscribe(subscriber);

    const newValue = 'xyz';
    subscription.update(newValue);

    expect(subscriber).toHaveBeenCalledWith(newValue);
  });

  it('updates the current value when the value has changed before subscription', async () => {
    const subscription = createAsyncSubscription('abc');
    const statefulSubscription = makeStateful(subscription);
    const subscriber = jest.fn();
    statefulSubscription.subscribe(subscriber);

    const newValue = 'xyz';
    subscription.update(newValue);

    await subscription.resolve();

    expect(subscriber).toHaveBeenCalledWith(newValue);
    expect(statefulSubscription.getCurrentValue()).toBe(newValue);
  });

  it('releases the subscription when stopped', async () => {
    const subscription = createAsyncSubscription('abc');
    const statefulSubscription = makeStateful(subscription);

    await subscription.resolve();
    await statefulSubscription.stop();

    expect(release).toHaveBeenCalledWith(subscription);
  });

  it('unsubscribes from the subscription on stop, and does not apply any updates', async () => {
    const subscription = createAsyncSubscription('abc');
    const statefulSubscription = makeStateful(subscription);
    const subscriber = jest.fn();
    statefulSubscription.subscribe(subscriber);

    const newValue = 'xyz';
    subscription.update(newValue);

    statefulSubscription.stop();
    await subscription.resolve();

    expect(release).toHaveBeenCalledWith(subscription);
    expect(subscriber).not.toHaveBeenCalled();
    expect(statefulSubscription.getCurrentValue()).not.toBe(newValue);
  });
});

function createAsyncSubscription<T>(
  initial: T,
): AsyncSubscription<T> & {update(value: T): void; resolve(): Promise<void>} {
  let current = initial;
  let resolved = false;
  const subscribers = new Set<
    Parameters<AsyncSubscription<T>['subscribe']>[0]
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
