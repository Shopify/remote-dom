import type {RemoteConnection, RemoteMutationRecord} from '../types.ts';

/**
 * A wrapper around a `RemoteConnection` that batches mutations. By default, this
 * all calls are flushed in a queued microtask, but this can be customized by passing
 * a custom `batch` option.
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
  let channel: MessageChannel;

  return (queue: () => void) => {
    // In environments without a `MessageChannel`, use a `setTimeout` fallback.
    if (typeof MessageChannel !== 'function') {
      setTimeout(() => {
        queue();
      }, 0);
      return;
    }

    // `MessageChannel` trick that forces the code to run on the next task.
    channel ??= new MessageChannel();
    channel.port1.onmessage = () => {
      queue();
    };
    channel.port2.postMessage(null);
  };
}
