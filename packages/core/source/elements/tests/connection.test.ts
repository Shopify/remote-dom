import '../../polyfill/polyfill.ts';

import {afterEach, describe, expect, it, vi, type MockedObject} from 'vitest';

import {BatchingRemoteConnection, type RemoteConnection} from '../../elements';

describe('BatchingRemoteConnection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('batches mutations on a microtask', async () => {
    const connection = createRemoteConnectionSpy();
    const batchingConnection = new BatchingRemoteConnection(connection);

    batchingConnection.mutate([1, 2, 3]);
    batchingConnection.mutate([4, 5, 6]);

    expect(connection.mutate).not.toHaveBeenCalled();

    await waitForNextMicrotask();

    expect(connection.mutate).toHaveBeenCalledTimes(1);
    expect(connection.mutate).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6]);

    batchingConnection.mutate([7, 8, 9]);

    expect(connection.mutate).toHaveBeenCalledTimes(1);

    await waitForNextMicrotask();

    expect(connection.mutate).toHaveBeenCalledTimes(2);
    expect(connection.mutate).toHaveBeenCalledWith([7, 8, 9]);
  });

  it('flushes mutations before an awaited promise resolves', async () => {
    const connection = createRemoteConnectionSpy();
    const batchingConnection = new BatchingRemoteConnection(connection);

    batchingConnection.mutate([1, 2, 3]);

    // An `await` yields to the microtask queue, so microtask-scheduled
    // flushes must have run by the time execution resumes here.
    await Promise.resolve();

    expect(connection.mutate).toHaveBeenCalledTimes(1);
    expect(connection.mutate).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('uses queueMicrotask to schedule the batch flush', () => {
    const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');
    const connection = createRemoteConnectionSpy();
    const batchingConnection = new BatchingRemoteConnection(connection);

    batchingConnection.mutate([1, 2, 3]);

    expect(queueMicrotaskSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to Promise.resolve().then() when queueMicrotask is unavailable', async () => {
    const originalQueueMicrotask = globalThis.queueMicrotask;
    // @ts-expect-error — intentionally removing to test fallback.
    delete globalThis.queueMicrotask;

    try {
      const connection = createRemoteConnectionSpy();
      const batchingConnection = new BatchingRemoteConnection(connection);

      batchingConnection.mutate([1, 2, 3]);
      batchingConnection.mutate([4, 5, 6]);

      expect(connection.mutate).not.toHaveBeenCalled();

      await Promise.resolve();

      expect(connection.mutate).toHaveBeenCalledTimes(1);
      expect(connection.mutate).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6]);
    } finally {
      globalThis.queueMicrotask = originalQueueMicrotask;
    }
  });

  it('flush() drains queued mutations synchronously', () => {
    const connection = createRemoteConnectionSpy();
    const batchingConnection = new BatchingRemoteConnection(connection);

    batchingConnection.mutate([1, 2, 3]);
    batchingConnection.flush();

    expect(connection.mutate).toHaveBeenCalledOnce();
    expect(connection.mutate).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('flush() prevents the pending microtask from double-firing, and a subsequent mutate() schedules a fresh batch', async () => {
    const connection = createRemoteConnectionSpy();
    const batchingConnection = new BatchingRemoteConnection(connection);

    batchingConnection.mutate([1, 2, 3]);
    batchingConnection.flush();

    await waitForNextMicrotask();

    // The scheduled microtask still runs, but flush() drained the queue
    // already, so the underlying connection isn't called a second time.
    expect(connection.mutate).toHaveBeenCalledOnce();

    batchingConnection.mutate([4, 5, 6]);

    await waitForNextMicrotask();

    expect(connection.mutate).toHaveBeenCalledTimes(2);
    expect(connection.mutate).toHaveBeenCalledWith([4, 5, 6]);
  });

  it('enqueues the batch function only once while items are in the queue', async () => {
    const connection = createRemoteConnectionSpy();
    const batch = vi.fn();
    const batchingConnection = new BatchingRemoteConnection(connection, {
      batch,
    });

    batchingConnection.mutate([1, 2, 3]);
    batchingConnection.mutate([4, 5, 6]);
    expect(batch).toHaveBeenCalledOnce();

    const batchCallback = batch.mock.calls[0]![0];
    batchCallback();

    batchingConnection.mutate([7, 8, 9]);
    expect(batch).toHaveBeenCalledTimes(2);
  });
});

async function waitForNextMicrotask() {
  await Promise.resolve();
}

function createRemoteConnectionSpy(): MockedObject<RemoteConnection> {
  return {
    mutate: vi.fn(),
    call: vi.fn(),
  };
}
