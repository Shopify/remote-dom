import type {MaybePromise} from '@remote-ui/rpc';

export type Subscriber<T> = (value: T) => void;

export type AsyncSubscribeResult<T> = [() => void, T];

export interface AsyncSubscription<T> {
  readonly initial: T;
  subscribe(subscriber: Subscriber<T>): MaybePromise<AsyncSubscribeResult<T>>;
}

// @see https://github.com/facebook/react/tree/master/packages/use-subscription
export interface SyncSubscription<T> {
  getCurrentValue(): T;
  subscribe(subscriber: Subscriber<T>): () => void;
}

export interface StatefulAsyncSubscription<T> extends SyncSubscription<T> {
  stop(): Promise<void>;
}
