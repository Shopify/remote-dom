import {RemoteComponentMap, RemoteChild} from '@remote-ui/types';

type NonOptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

type IfAllOptionalKeys<Obj, If, Else = never> = NonOptionalKeys<Obj> extends {
  length: 0;
}
  ? If
  : Else;

export enum Action {
  UpdateText,
  UpdateProps,
  InsertChild,
  RemoveChild,
  Mount,
}

export enum UpdateOperation {
  Insert,
  Remove,
}

export type Id = string;

export interface MessageMap {
  [Action.UpdateText]: [Id, string];
  [Action.UpdateProps]: [Id, object];
  [Action.InsertChild]: [
    Id | undefined,
    number,
    RemoteTextSerialization | RemoteComponentSerialization<string>,
  ];
  [Action.RemoveChild]: [Id | undefined, number];
  [Action.Mount]: [
    (RemoteTextSerialization | RemoteComponentSerialization<string>)[],
  ];
}

export interface Dispatch {
  <T extends Action>(type: T, ...payload: MessageMap[T]): void | Promise<void>;
}

export enum RemoteKind {
  Text,
  Component,
}

type AllowedRemoteChildren<
  Children,
  Root extends RemoteRoot<any, any>
> = Children extends string ? RemoteComponent<Children, Root> : never;

type AllowedChildren<
  Children extends string | RemoteChild,
  Root extends RemoteRoot<any, any>
> = Children extends RemoteChild
  ? RemoteComponent<any, Root> | RemoteText<Root>
  : AllowedRemoteChildren<Children, Root>;

export interface RemoteRoot<
  AllowedComponents extends string = string,
  AllowedChildrenTypes extends AllowedComponents | RemoteChild = RemoteChild
> {
  readonly children: readonly AllowedChildren<
    AllowedChildrenTypes,
    RemoteRoot<AllowedComponents, AllowedChildrenTypes>
  >[];
  appendChild(
    child: AllowedChildren<
      AllowedChildrenTypes,
      RemoteRoot<AllowedComponents, AllowedChildrenTypes>
    >,
  ): void | Promise<void>;
  removeChild(
    child: AllowedChildren<
      AllowedChildrenTypes,
      RemoteRoot<AllowedComponents, AllowedChildrenTypes>
    >,
  ): void | Promise<void>;
  insertChildBefore(
    child: AllowedChildren<
      AllowedChildrenTypes,
      RemoteRoot<AllowedComponents, AllowedChildrenTypes>
    >,
    before: AllowedChildren<
      AllowedChildrenTypes,
      RemoteRoot<AllowedComponents, AllowedChildrenTypes>
    >,
  ): void | Promise<void>;
  createComponent<Type extends AllowedComponents>(
    type: Type,
    ...propsPart: IfAllOptionalKeys<
      PropsForRemoteComponent<Type>,
      [PropsForRemoteComponent<Type>?],
      [PropsForRemoteComponent<Type>]
    >
  ): RemoteComponent<Type, RemoteRoot<AllowedComponents, AllowedChildrenTypes>>;
  createText(
    text?: string,
  ): RemoteText<RemoteRoot<AllowedComponents, AllowedChildrenTypes>>;
  mount(): Promise<void>;
}

export interface RemoteComponent<
  Type extends string,
  Root extends RemoteRoot<any, any>
> {
  readonly id: string;
  readonly type: Type;
  readonly props: PropsForRemoteComponent<Type>;
  readonly children: readonly ChildrenForRemoteComponent<Type>[];
  readonly root: Root;
  readonly top: RemoteComponent<string, Root> | Root | null;
  readonly parent: RemoteComponent<string, Root> | Root | null;
  updateProps(
    props: Partial<PropsForRemoteComponent<Type>>,
  ): void | Promise<void>;
  appendChild(child: ChildrenForRemoteComponent<Type>): void | Promise<void>;
  removeChild(child: ChildrenForRemoteComponent<Type>): void | Promise<void>;
  insertChildBefore(
    child: ChildrenForRemoteComponent<Type>,
    before: ChildrenForRemoteComponent<Type>,
  ): void | Promise<void>;
}

export interface RemoteText<Root extends RemoteRoot<any, any>> {
  readonly id: string;
  readonly text: string;
  readonly root: Root;
  readonly top: RemoteComponent<string, Root> | Root | null;
  readonly parent: RemoteComponent<string, Root> | Root | null;
  updateText(text: string): void | Promise<void>;
}

export type RemoteComponentSerialization<Type extends string = string> = {
  -readonly [K in 'id' | 'type' | 'props']: RemoteComponent<Type, any>[K];
} & {
  children: (RemoteComponentSerialization<string> | RemoteTextSerialization)[];
};

export type RemoteTextSerialization = {
  -readonly [K in 'id' | 'text']: RemoteText<any>[K];
};

export type Serialized<T> = T extends RemoteComponent<infer Type, any>
  ? RemoteComponentSerialization<Type>
  : T extends RemoteText<any>
  ? RemoteTextSerialization
  : never;

export type PropsForRemoteComponent<
  T extends string
> = T extends keyof RemoteComponentMap
  ? RemoteComponentMap[T] extends [infer U, ...any[]]
    ? U
    : never
  : never;

export type ChildrenForRemoteComponent<
  T extends string
> = T extends keyof RemoteComponentMap
  ? RemoteComponentMap[T] extends [any, infer U]
    ? U extends RemoteChild
      ? RemoteComponent<any, any> | RemoteText<any>
      : U
    : never
  : never;

export enum RemoteComponentViolationType {
  InsertChild,
  InsertRoot,
  UpdateProps,
}

// export interface RemoteComponentInsertChildViolation {
//   type: RemoteComponentViolationType.InsertChild;
//   component: string;
//   message: string;
// }

// export interface RemoteComponentInsertRootViolation {
//   type: RemoteComponentViolationType.InsertRoot;
//   component: string;
//   message: string;
// }

// export interface RemoteComponentUpdatePropsViolation {
//   type: RemoteComponentViolationType.UpdateProps;
//   component: string;
//   message: string;
// }
