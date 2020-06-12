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

type AlwaysAsync<T> = T extends Promise<any>
  ? T
  : T extends infer U | Promise<infer U>
  ? Promise<U>
  : T extends (...args: infer Args) => infer TypeReturned
  ? (...args: Args) => AlwaysAsync<TypeReturned>
  : T extends (infer ArrayElement)[]
  ? AlwaysAsync<ArrayElement>[]
  : T extends readonly (infer ArrayElement)[]
  ? readonly AlwaysAsync<ArrayElement>[]
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
  : T extends readonly (infer ArrayElement)[]
  ? readonly SafeRpcArgument<ArrayElement>[]
  : T extends object
  ? {[K in keyof T]: SafeRpcArgument<T[K]>}
  : T;

export const RETAIN_METHOD = Symbol('retain');
export const RELEASE_METHOD = Symbol('release');
export const RETAINED_BY = Symbol('retainedBy');

export interface Retainer {
  add(manageable: MemoryManageable): void;
}

export interface MemoryManageable {
  readonly [RETAINED_BY]: Set<Retainer>;
  [RETAIN_METHOD](): void;
  [RELEASE_METHOD](): void;
}

export interface FunctionStrategy<T> {
  toWire(value: Function): [T, Transferable[]?];
  fromWire(value: T, retainedBy?: Retainer[]): Function;
  revoke?(value: Function): void;
  exchange?(value: Function, newValue: Function): void;
  terminate?(): void;
  has(value: Function): boolean;
}

export interface FunctionStrategyOptions {
  readonly messenger: MessageEndpoint;
  uuid(): string;
  toWire(value: unknown): [any, Transferable[]?];
  fromWire<Input = unknown, Output = unknown>(
    value: Input,
    retainedBy?: Retainer[],
  ): Output;
}
