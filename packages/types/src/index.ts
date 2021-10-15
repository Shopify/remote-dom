export type RemoteComponentType<
  Type extends string,
  Props = Record<string, never>,
  AllowedChildren extends RemoteComponentType<string, any> | boolean = true,
> =
  // If we don't include the object part, this type gets "erased" to just
  // be the string type, which means the props/ children can’t be extracted
  // from the object later.
  Type & {
    readonly type?: Type;
    readonly props?: Props;
    readonly children?: AllowedChildren;
  };

export type IdentifierForRemoteComponent<T> = T extends RemoteComponentType<
  infer Type,
  any,
  any
>
  ? Type
  : never;

export type PropsForRemoteComponent<T> = T extends RemoteComponentType<
  string,
  infer Props,
  any
>
  ? Props
  : never;

export type AllowedChildrenForRemoteComponent<T> =
  T extends RemoteComponentType<string, any, infer Children>
    ? Children extends true
      ? RemoteComponentType<string, any, any>
      : Children extends false
      ? never
      : Children
    : never;
