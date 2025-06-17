import '../../polyfill/polyfill.ts';

import {describe, expect, it, vi, type MockedObject} from 'vitest';

import {BatchingRemoteConnection, RemoteConnection} from '../../elements';

describe('BatchingRemoteConnection', () => {
  it('batches mutations', async () => {
    const connection = createRemoteConnectionSpy();
    const batchingConnection = new BatchingRemoteConnection(connection);

    batchingConnection.mutate([1, 2, 3]);
    batchingConnection.mutate([4, 5, 6]);

    expect(connection.mutate).not.toHaveBeenCalled();

    await waitForNextTask();

    expect(connection.mutate).toHaveBeenCalledTimes(1);
    expect(connection.mutate).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6]);

    batchingConnection.mutate([7, 8, 9]);

    expect(connection.mutate).toHaveBeenCalledTimes(1);

    await waitForNextTask();

    expect(connection.mutate).toHaveBeenCalledTimes(2);
    expect(connection.mutate).toHaveBeenCalledWith([7, 8, 9]);
  });

  it('batches mutations with setTimeout when there is no MessageChannel', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'MessageChannel', 'get').mockReturnValue(
      undefined as any,
    );
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const connection = createRemoteConnectionSpy();
    const batchingConnection = new BatchingRemoteConnection(connection);

    batchingConnection.mutate([1, 2, 3]);
    batchingConnection.mutate([4, 5, 6]);

    expect(connection.mutate).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(connection.mutate).toHaveBeenCalledTimes(1);
    expect(connection.mutate).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6]);

    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('flushes mutations', async () => {
    const connection = createRemoteConnectionSpy();
    const batchingConnection = new BatchingRemoteConnection(connection);

    batchingConnection.mutate([1, 2, 3]);
    batchingConnection.flush();

    expect(connection.mutate).toHaveBeenCalledOnce();
    expect(connection.mutate).toHaveBeenCalledWith([1, 2, 3]);

    await waitForNextTask();

    // ensure it wasn't called again
    expect(connection.mutate).toHaveBeenCalledOnce();
    batchingConnection.mutate([4, 5, 6]);

    await waitForNextTask();

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

    const batchCallback = batch.mock.calls[0][0];
    batchCallback();

    batchingConnection.mutate([7, 8, 9]);
    expect(batch).toHaveBeenCalledTimes(2);
  });
});

async function waitForNextTask() {
  const channel = new MessageChannel();
  const promise = new Promise((resolve) => {
    channel.port1.onmessage = resolve;
  });
  channel.port2.postMessage(null);

  await promise;
}

function createRemoteConnectionSpy(): MockedObject<RemoteConnection> {
  return {
    mutate: vi.fn(),
    call: vi.fn(),
  };
}
