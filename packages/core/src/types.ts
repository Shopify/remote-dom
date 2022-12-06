import {
  RemoteComponentType,
  IdentifierForRemoteComponent,
  PropsForRemoteComponent,
} from '@remote-ui/types';

type NonOptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

type IfAllOptionalKeys<Obj, If, Else = never> = Obj extends Record<
  string,
  never
>
  ? If
  : NonOptionalKeys<Obj> extends {
      length: 0;
    }
  ? If
  : Else;

export const ACTION_MOUNT = 0;
export const ACTION_INSERT_CHILD = 1;
export const ACTION_REMOVE_CHILD = 2;
export const ACTION_UPDATE_TEXT = 3;
export const ACTION_UPDATE_PROPS = 4;

export const UPDATE_INSERT = 0;
export const UPDATE_REMOVE = 1;

export const KIND_ROOT = 0;
export const KIND_COMPONENT = 1;
export const KIND_TEXT = 2;
export const KIND_FRAGMENT = 3;

export type Id = string;

export interface ActionArgumentMap {
  [ACTION_MOUNT]: [(RemoteTextSerialization | RemoteComponentSerialization)[]];
  [ACTION_INSERT_CHILD]: [
    Id | undefined,
    number,
    RemoteTextSerialization | RemoteComponentSerialization,
    Id | undefined | false,
  ];
  [ACTION_REMOVE_CHILD]: [Id | undefined, number];
  [ACTION_UPDATE_TEXT]: [Id, string];
  [ACTION_UPDATE_PROPS]: [Id, Record<string, unknown>];
}

export interface RemoteChannel {
  <T extends keyof ActionArgumentMap>(
    type: T,
    ...payload: ActionArgumentMap[T]
  ): void | Promise<void>;
}

type AllowedRemoteChildren<
  Children,
  Root extends RemoteRoot<any, any>,
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
  Children extends RemoteComponentType<string, any> | boolean,
  Root extends RemoteRoot<any, any>,
  AllowString extends boolean = false,
> = Children extends true
  ? RemoteComponent<any, Root> | AllowedTextChildren<Root, AllowString>
  : Children extends false
  ? never
  :
      | AllowedRemoteChildren<Children, Root>
      | AllowedTextChildren<Root, AllowString>;

type AllowedTextChildren<
  Root extends RemoteRoot<any, any>,
  AllowString extends boolean = false,
> = AllowString extends true ? RemoteText<Root> | string : RemoteText<Root>;

export interface RemoteRootOptions<
  AllowedComponents extends RemoteComponentType<string, any>,
> {
  readonly strict?: boolean;
  readonly components?: ReadonlyArray<AllowedComponents>;
}

export interface RemoteRoot<
  AllowedComponents extends RemoteComponentType<
    string,
    any
  > = RemoteComponentType<any, any>,
  AllowedChildrenTypes extends
    | RemoteComponentType<string, any>
    | boolean = true,
> {
  readonly kind: typeof KIND_ROOT;
  readonly children: ReadonlyArray<
    AllowedChildren<
      AllowedChildrenTypes,
      RemoteRoot<AllowedComponents, AllowedChildrenTypes>
    >
  >;
  readonly options: RemoteRootOptions<AllowedComponents>;
  append(
    ...children: AllowedChildren<
      AllowedChildrenTypes,
      RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
      true
    >[]
  ): void | Promise<void>;
  /**
   * @deprecated use `RemoteRoot.append` instead.
   */
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
  replaceChildren(
    ...children: AllowedChildren<
      AllowedChildrenTypes,
      RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
      true
    >[]
  ): void | Promise<void>;
  insertBefore(
    child: AllowedChildren<
      AllowedChildrenTypes,
      RemoteRoot<AllowedComponents, AllowedChildrenTypes>
    >,
    before?: AllowedChildren<
      AllowedChildrenTypes,
      RemoteRoot<AllowedComponents, AllowedChildrenTypes>
    > | null,
  ): void | Promise<void>;
  /**
   * @deprecated use `RemoteRoot.insertBefore` instead.
   */
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
    ...rest: IfAllOptionalKeys<
      PropsForRemoteComponent<Type>,
      | [
          (PropsForRemoteComponent<Type> | null)?,
          ...AllowedChildren<
            AllowedChildrenTypes,
            RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
            true
          >[],
        ]
      | [
          (PropsForRemoteComponent<Type> | null)?,
          AllowedChildren<
            AllowedChildrenTypes,
            RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
            true
          >[]?,
        ],
      | [
          PropsForRemoteComponent<Type>,
          ...AllowedChildren<
            AllowedChildrenTypes,
            RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
            true
          >[],
        ]
      | [
          PropsForRemoteComponent<Type>,
          AllowedChildren<
            AllowedChildrenTypes,
            RemoteRoot<AllowedComponents, AllowedChildrenTypes>,
            true
          >[]?,
        ]
    >
  ): RemoteComponent<Type, RemoteRoot<AllowedComponents, AllowedChildrenTypes>>;
  createText(
    text?: string,
  ): RemoteText<RemoteRoot<AllowedComponents, AllowedChildrenTypes>>;
  createFragment(): RemoteFragment<
    RemoteRoot<AllowedComponents, AllowedChildrenTypes>
  >;
  mount(): Promise<void>;
}

export interface RemoteComponent<
  Type extends RemoteComponentType<string, any>,
  Root extends RemoteRoot<any, any>,
> {
  readonly kind: typeof KIND_COMPONENT;
  readonly id: string;
  readonly type: IdentifierForRemoteComponent<Type>;
  readonly props: PropsForRemoteComponent<Type>;
  readonly remoteProps: PropsForRemoteComponent<Type>;
  readonly children: ReadonlyArray<
    AllowedChildren<ExtractChildren<Type>, Root>
  >;
  readonly root: Root;
  readonly top: RemoteComponent<any, Root> | Root | null;
  readonly parent: RemoteComponent<any, Root> | Root | null;
  remove(): void | Promise<void>;
  updateProps(
    props: Partial<PropsForRemoteComponent<Type>>,
  ): void | Promise<void>;
  append(
    ...children: AllowedChildren<ExtractChildren<Type>, Root, true>[]
  ): void | Promise<void>;
  /**
   * @deprecated use `RemoteComponent.append` instead.
   */
  appendChild(
    child: AllowedChildren<ExtractChildren<Type>, Root, true>,
  ): void | Promise<void>;
  removeChild(
    child: AllowedChildren<ExtractChildren<Type>, Root>,
  ): void | Promise<void>;
  replaceChildren(
    ...children: AllowedChildren<ExtractChildren<Type>, Root, true>[]
  ): void | Promise<void>;
  insertBefore(
    child: AllowedChildren<ExtractChildren<Type>, Root>,
    before?: AllowedChildren<ExtractChildren<Type>, Root> | null,
  ): void | Promise<void>;
  /**
   * @deprecated use `RemoteComponent.insertBefore` instead.
   */
  insertChildBefore(
    child: AllowedChildren<ExtractChildren<Type>, Root>,
    before: AllowedChildren<ExtractChildren<Type>, Root>,
  ): void | Promise<void>;
}

export interface RemoteFragment<
  Root extends RemoteRoot<any, any> = RemoteRoot<any, any>,
> {
  readonly kind: typeof KIND_FRAGMENT;
  readonly id: string;
  readonly children: ReadonlyArray<AllowedChildren<ExtractChildren<any>, Root>>;
  readonly root: Root;
  readonly top: RemoteComponent<any, Root> | Root | null;
  readonly parent: RemoteComponent<any, Root> | Root | null;
  append(
    ...children: AllowedChildren<ExtractChildren<any>, Root, true>[]
  ): void | Promise<void>;
  /**
   * @deprecated use `RemoteComponent.append` instead.
   */
  appendChild(
    child: AllowedChildren<ExtractChildren<any>, Root, true>,
  ): void | Promise<void>;
  removeChild(
    child: AllowedChildren<ExtractChildren<any>, Root>,
  ): void | Promise<void>;
  replaceChildren(
    ...children: AllowedChildren<ExtractChildren<any>, Root, true>[]
  ): void | Promise<void>;
  insertBefore(
    child: AllowedChildren<ExtractChildren<any>, Root>,
    before?: AllowedChildren<ExtractChildren<any>, Root> | null,
  ): void | Promise<void>;
  /**
   * @deprecated use `RemoteComponent.insertBefore` instead.
   */
  insertChildBefore(
    child: AllowedChildren<ExtractChildren<any>, Root>,
    before: AllowedChildren<ExtractChildren<any>, Root>,
  ): void | Promise<void>;
}

export interface RemoteText<Root extends RemoteRoot<any, any>> {
  readonly kind: typeof KIND_TEXT;
  readonly id: string;
  readonly text: string;
  readonly root: Root;
  readonly top: RemoteComponent<any, Root> | Root | null;
  readonly parent: RemoteComponent<any, Root> | Root | null;
  update(text: string): void | Promise<void>;
  /**
   * @deprecated use `RemoteText.update` instead.
   */
  updateText(text: string): void | Promise<void>;
  remove(): void | Promise<void>;
}

export type RemoteChild<Root extends RemoteRoot<any, any>> =
  | RemoteComponent<any, Root>
  | RemoteText<Root>;

export type RemoteComponentSerialization<
  Type extends RemoteComponentType<string, any> = RemoteComponentType<
    string,
    any
  >,
> = {
  -readonly [K in 'id' | 'type' | 'kind' | 'props']: RemoteComponent<
    Type,
    any
  >[K];
} & {
  children: (RemoteComponentSerialization | RemoteTextSerialization)[];
};

export type RemoteTextSerialization = {
  -readonly [K in 'id' | 'text' | 'kind']: RemoteText<any>[K];
};

export type RemoteFragmentSerialization = {
  -readonly [K in 'id' | 'kind']: RemoteFragment<any>[K];
} & {
  children: (RemoteComponentSerialization | RemoteTextSerialization)[];
};

export type Serialized<T> = T extends RemoteComponent<infer Type, any>
  ? RemoteComponentSerialization<Type>
  : T extends RemoteText<any>
  ? RemoteTextSerialization
  : never;
