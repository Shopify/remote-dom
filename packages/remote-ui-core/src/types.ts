import {
  RemoteComponentType,
  RemoteChild,
  PropsForRemoteComponent,
  AllowedChildrenForRemoteComponent,
} from '@shopify/remote-ui-types';

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
    RemoteTextSerialization | RemoteComponentSerialization,
  ];
  [Action.RemoveChild]: [Id | undefined, number];
  [Action.Mount]: [(RemoteTextSerialization | RemoteComponentSerialization)[]];
}

export interface RemoteChannel {
  <T extends Action>(type: T, ...payload: MessageMap[T]): void | Promise<void>;
}

export enum RemoteKind {
  Text,
  Component,
}

type AllowedRemoteChildren<
  Children,
  Root extends RemoteRoot<any, any>
> = Children extends RemoteComponentType<any, any>
  ? RemoteComponent<Children, Root>
  : never;

type AllowedChildren<
  Children extends RemoteComponentType<any, any> | RemoteChild,
  Root extends RemoteRoot<any, any>
> = Children extends RemoteChild
  ? RemoteComponent<any, Root> | RemoteText<Root>
  : AllowedRemoteChildren<Children, Root>;

export interface RemoteRoot<
  AllowedComponents extends RemoteComponentType<any, any> = RemoteComponentType<
    any,
    any
  >,
  AllowedChildrenTypes extends AllowedComponents | RemoteChild = RemoteChild
> {
  readonly children: ReadonlyArray<
    AllowedChildren<
      AllowedChildrenTypes,
      RemoteRoot<AllowedComponents, AllowedChildrenTypes>
    >
  >;
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
  Type extends RemoteComponentType<any, any>,
  Root extends RemoteRoot<any, any>
> {
  readonly id: string;
  readonly type: Type['type'];
  readonly props: PropsForRemoteComponent<Type>;
  readonly children: ReadonlyArray<AllowedChildrenForRemoteComponent<Type>>;
  readonly root: Root;
  readonly top: RemoteComponent<any, Root> | Root | null;
  readonly parent: RemoteComponent<any, Root> | Root | null;
  updateProps(
    props: Partial<PropsForRemoteComponent<Type>>,
  ): void | Promise<void>;
  appendChild(
    child: AllowedChildrenForRemoteComponent<Type>,
  ): void | Promise<void>;
  removeChild(
    child: AllowedChildrenForRemoteComponent<Type>,
  ): void | Promise<void>;
  insertChildBefore(
    child: AllowedChildrenForRemoteComponent<Type>,
    before: AllowedChildrenForRemoteComponent<Type>,
  ): void | Promise<void>;
}

export interface RemoteText<Root extends RemoteRoot<any, any>> {
  readonly id: string;
  readonly text: string;
  readonly root: Root;
  readonly top: RemoteComponent<any, Root> | Root | null;
  readonly parent: RemoteComponent<any, Root> | Root | null;
  updateText(text: string): void | Promise<void>;
}

export type RemoteComponentSerialization<
  Type extends RemoteComponentType<any, any> = RemoteComponentType<any, any>
> = {
  -readonly [K in 'id' | 'type' | 'props']: RemoteComponent<Type, any>[K];
} & {
  children: (RemoteComponentSerialization | RemoteTextSerialization)[];
};

export type RemoteTextSerialization = {
  -readonly [K in 'id' | 'text']: RemoteText<any>[K];
};

export type Serialized<T> = T extends RemoteComponent<infer Type, any>
  ? RemoteComponentSerialization<Type>
  : T extends RemoteText<any>
  ? RemoteTextSerialization
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
