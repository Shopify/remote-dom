import type {RemoteConnection, RemoteMutationRecord} from '../types.ts';

/**
 * A wrapper around a `RemoteConnection` that batches mutations. By default,
 * queued mutations are flushed in a microtask (via `queueMicrotask`, falling
 * back to `Promise.resolve().then(...)` in environments where
 * `queueMicrotask` is unavailable). This can be customized by passing a
 * custom `batch` option — for example, to defer flushes to a macrotask via
 * `MessageChannel` or `setTimeout`.
 */
export class BatchingRemoteConnection {
  readonly #connection: RemoteConnection;
  #queued: RemoteMutationRecord[] | undefined;
  #batch: (action: () => void) => void;

  constructor(
    connection: RemoteConnection,
    {
      batch = createDefaultBatchFunction(),
    }: {batch?: (action: () => void) => void} = {},
  ) {
    this.#connection = connection;
    this.#batch = batch;
  }

  call(id: string, method: string, ...args: readonly unknown[]) {
    this.#connection.call(id, method, ...args);
  }

  mutate(records: any[]) {
    const queued = this.#queued;

    this.#queued ??= [];
    this.#queued.push(...records);

    if (queued) {
      return;
    }

    this.#batch(() => {
      this.flush();
    });
  }

  flush() {
    if (!this.#queued) {
      return;
    }

    this.#connection.mutate(this.#queued);
    this.#queued = undefined;
  }
}

function createDefaultBatchFunction() {
  return (queue: () => void) => {
    // Flush on a microtask so that mutations are observable on the host
    // before any `await`ed RPC response resolves. In environments without
    // `queueMicrotask`, fall back to `Promise.resolve().then(...)`, which
    // also schedules on the microtask queue.
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(queue);
      return;
    }

    Promise.resolve().then(queue);
  };
}
