import type {
  RemoteComponentType,
  PropsForRemoteComponent,
} from '@remote-ui/core';

export interface RootNode<Props> extends Node<Props> {
  unmount(): void;
  act<T>(action: () => T, options?: {update?: boolean}): T;
}

export interface Node<Props> {
  readonly props: Props;
  readonly type: RemoteComponentType<string, any, any> | null;
  readonly instance: any;
  readonly children: (Node<unknown> | string)[];
  readonly descendants: (Node<unknown> | string)[];
  readonly text: string;

  prop<K extends keyof Props>(key: K): Props[K];

  is<Type extends RemoteComponentType<string, any, any>>(
    type: Type,
  ): this is Node<PropsForRemoteComponent<Type>>;

  find<Type extends RemoteComponentType<string, any, any>>(
    type: Type,
    props?: Partial<PropsForRemoteComponent<Type>>,
  ): Node<PropsForRemoteComponent<Type>> | null;
  findAll<Type extends RemoteComponentType<string, any, any> | string>(
    type: Type,
    props?: Partial<PropsForRemoteComponent<Type>>,
  ): Node<PropsForRemoteComponent<Type>>[];
  findWhere<Props = unknown>(predicate: Predicate): Node<Props> | null;
  findAllWhere<Props = unknown>(predicate: Predicate): Node<Props>[];

  trigger<K extends FunctionKeys<Props>>(
    prop: K,
    ...args: DeepPartial<MaybeFunctionParameters<Props[K]>>
  ): MaybeFunctionReturnType<NonNullable<Props[K]>>;
  triggerKeypath<T = unknown>(keypath: string, ...args: unknown[]): T;

  debug(options?: DebugOptions): string;
  toString(): string;
}

export interface DebugOptions {
  all?: boolean;
  depth?: number;
  verbosity?: number;
}

type FunctionKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends (...args: any[]) => any
    ? K
    : never;
}[keyof T];

type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends object
  ? {
      [K in keyof T]?: DeepPartial<T[K]>;
    }
  : T;

export type Predicate = (node: Node<unknown>) => boolean;

type MaybeFunctionReturnType<T> = T extends (...args: any[]) => any
  ? ReturnType<T>
  : unknown;

type MaybeFunctionParameters<T> = T extends (...args: any[]) => any
  ? ReturnType<T>
  : [];
