import {
  RemoteComponentType,
  IdentifierForRemoteComponent,
  PropsForRemoteComponent,
} from '@remote-ui/types';

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
> = Children extends RemoteComponentType<string, any, any>
  ? RemoteComponent<Children, Root>
  : never;

type ExtractChildren<Type> = Type extends RemoteComponentType<
  string,
  any,
  infer Children
>
  ? Children
  : never;

type AllowedChildren<
  Children extends RemoteComponentType<any, any> | boolean,
  Root extends RemoteRoot<any, any>,
  AllowString extends boolean = false
> = Children extends true
  ? RemoteComponent<any, Root> | AllowedTextChildren<Root, AllowString>
  : Children extends false
  ? never
  :
      | AllowedRemoteChildren<Children, Root>
      | AllowedTextChildren<Root, AllowString>;

type AllowedTextChildren<
  Root extends RemoteRoot<any, any>,
  AllowString extends boolean = false
> = AllowString extends true ? RemoteText<Root> | string : RemoteText<Root>;

export interface RemoteRoot<
  AllowedComponents extends RemoteComponentType<any, any> = RemoteComponentType<
    any,
    any
  >,
  AllowedChildrenTypes extends RemoteComponentType<any, any> | boolean = true
> {
  readonly children: readonly AllowedChildren<
    AllowedChildrenTypes,
    RemoteRoot<AllowedComponents, AllowedChildrenTypes>
  >[];
  appendChild(
    child: AllowedChildren<
      AllowedChildrenTypes,
      RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
      true
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
  readonly type: IdentifierForRemoteComponent<Type>;
  readonly props: PropsForRemoteComponent<Type>;
  readonly children: readonly AllowedChildren<ExtractChildren<Type>, Root>[];
  readonly root: Root;
  readonly top: RemoteComponent<any, Root> | Root | null;
  readonly parent: RemoteComponent<any, Root> | Root | null;
  updateProps(
    props: Partial<PropsForRemoteComponent<Type>>,
  ): void | Promise<void>;
  appendChild(
    child: AllowedChildren<ExtractChildren<Type>, Root, true>,
  ): void | Promise<void>;
  removeChild(
    child: AllowedChildren<ExtractChildren<Type>, Root>,
  ): void | Promise<void>;
  insertChildBefore(
    child: AllowedChildren<ExtractChildren<Type>, Root>,
    before: AllowedChildren<ExtractChildren<Type>, Root>,
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
