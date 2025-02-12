import type {MaybePromise} from '@remote-ui/rpc';

export type Subscriber<T> = (value: T) => unknown;

export type RemoteSubscribeResult<T> = [() => void, T];

export interface SyncSubscribable<T> {
  readonly current: T;
  subscribe(subscriber: Subscriber<T>): () => void;
}

export interface RemoteSubscribable<T> {
  readonly initial: T;
  subscribe(subscriber: Subscriber<T>): MaybePromise<RemoteSubscribeResult<T>>;
}

export interface StatefulRemoteSubscribable<T> extends SyncSubscribable<T> {
  destroy(): Promise<void>;
}
