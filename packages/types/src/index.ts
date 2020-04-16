export type RemoteComponentType<
  Type extends string,
  Props = {},
  AllowedChildren extends RemoteComponentType<any, any> | boolean = true
> = Type & {
  readonly __type: Type;
  readonly __props: Props;
  readonly __allowedChildren: AllowedChildren;
};

export type PropsForRemoteComponent<T> = T extends RemoteComponentType<
  string,
  infer Props,
  any
>
  ? Props
  : never;

export type AllowedChildrenForRemoteComponent<
  T
> = T extends RemoteComponentType<string, any, infer Children>
  ? Children extends true
    ? RemoteComponentType<string, any, any>
    : Children extends false
    ? never
    : Children
  : never;
