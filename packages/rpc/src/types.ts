export interface MessageEndpoint {
  postMessage(message: any, transferables?: Transferable[]): void;
  addEventListener(
    event: 'message',
    listener: (event: MessageEvent) => void,
  ): void;
  removeEventListener(
    event: 'message',
    listener: (event: MessageEvent) => void,
  ): void;
  terminate?(): void;
}

export type RemoteCallable<T> = {[K in keyof T]: RemoteCallableField<T[K]>};

type RemoteCallableField<T> = T extends (
  ...args: infer Args
) => infer TypeReturned
  ? (...args: Args) => Promise<ForcePromiseWrapped<TypeReturned>>
  : never;

type ForcePromiseWrapped<T> = T extends infer U | Promise<infer U>
  ? ForcePromise<U>
  : ForcePromise<T>;

type ForcePromise<T> = T extends Promise<any>
  ? T
  : T extends (...args: infer Args) => infer TypeReturned
  ? (...args: Args) => Promise<ForcePromiseWrapped<TypeReturned>>
  : T extends (infer ArrayElement)[]
  ? ForcePromiseArray<ArrayElement>
  : T extends object
  ? {[K in keyof T]: ForcePromiseWrapped<T[K]>}
  : T;

interface ForcePromiseArray<T> extends Array<ForcePromiseWrapped<T>> {}

export type SafeRpcArgument<T> = T extends (
  ...args: infer Args
) => infer TypeReturned
  ? TypeReturned extends Promise<any>
    ? (...args: Args) => TypeReturned
    : (...args: Args) => TypeReturned | Promise<TypeReturned>
  : T extends (infer ArrayElement)[]
  ? SafeRpcArgumentArray<ArrayElement>
  : T extends object
  ? {[K in keyof T]: SafeRpcArgument<T[K]>}
  : T;

interface SafeRpcArgumentArray<T> extends Array<SafeRpcArgument<T>> {}

export const RETAIN_METHOD = Symbol.for('Remote::Retain');
export const RELEASE_METHOD = Symbol.for('Remote::Release');
export const RETAINED_BY = Symbol.for('Remote::RetainedBy');

export interface Retainer {
  add(manageable: MemoryManageable): void;
}

export interface MemoryManageable {
  readonly [RETAINED_BY]: Set<Retainer>;
  [RETAIN_METHOD](): void;
  [RELEASE_METHOD](): void;
}
