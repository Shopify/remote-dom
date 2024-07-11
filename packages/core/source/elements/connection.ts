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

  mutate(records: any[]) {
    let queued = this.#queued;

    if (queued) {
      queued.push(...records);
      return;
    }

    queued = [...records];
    this.#queued = queued;

    this.#batch(() => {
      this.#connection.mutate(queued);
      this.#queued = undefined;
    });
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
    }

    // `MessageChannel` trick that forces the code to run on the next task.
    channel ??= new MessageChannel();
    channel.port1.onmessage = () => {
      queue();
    };
    channel.port2.postMessage(null);
  };
}
