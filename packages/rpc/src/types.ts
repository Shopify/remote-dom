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
  ? (...args: Args) => AlwaysAsync<TypeReturned>
  : never;

export type MaybePromise<T> = T extends Promise<any> ? T : T | Promise<T>;

type AlwaysAsync<T> = T extends Promise<any>
  ? T
  : T extends infer U | Promise<infer U>
  ? Promise<U>
  : T extends (...args: infer Args) => infer TypeReturned
  ? (...args: Args) => AlwaysAsync<TypeReturned>
  : T extends (infer ArrayElement)[]
  ? AlwaysAsync<ArrayElement>[]
  : T extends ReadonlyArray<infer ArrayElement>
  ? ReadonlyArray<AlwaysAsync<ArrayElement>>
  : T extends object
  ? {[K in keyof T]: AlwaysAsync<T[K]>}
  : T;

export type SafeRpcArgument<T> = T extends (
  ...args: infer Args
) => infer TypeReturned
  ? TypeReturned extends Promise<any>
    ? (...args: Args) => TypeReturned
    : (...args: Args) => TypeReturned | Promise<TypeReturned>
  : T extends (infer ArrayElement)[]
  ? SafeRpcArgument<ArrayElement>[]
  : T extends ReadonlyArray<infer ArrayElement>
  ? ReadonlyArray<SafeRpcArgument<ArrayElement>>
  : T extends object
  ? {[K in keyof T]: SafeRpcArgument<T[K]>}
  : T;

export const RETAIN_METHOD = Symbol.for('RemoteUi::Retain');
export const RELEASE_METHOD = Symbol.for('RemoteUi::Release');
export const RETAINED_BY = Symbol.for('RemoteUi::RetainedBy');

export interface Retainer {
  add(manageable: MemoryManageable): void;
}

export interface MemoryManageable {
  readonly [RETAINED_BY]: Set<Retainer>;
  [RETAIN_METHOD](): void;
  [RELEASE_METHOD](): void;
}

export interface EncodingStrategy {
  encode(value: unknown): [any, Transferable[]?];
  decode(value: unknown, retainedBy?: Iterable<Retainer>): unknown;
  call(id: string, args: any[]): Promise<any>;
  release(id: string): void;
  terminate?(): void;
}

export interface EncodingStrategyApi {
  uuid(): string;
  release(id: string): void;
  call(id: string, args: any[], retainedBy?: Iterable<Retainer>): Promise<any>;
}
