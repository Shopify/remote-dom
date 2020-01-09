export const ANY_CHILD = Symbol('RemoteUi.AnyChild');

export type RemoteChild = typeof ANY_CHILD;

export interface RemoteComponentType<
  Type extends string,
  Props = {},
  AllowedChildren extends
    | RemoteComponentType<any, any>
    | RemoteChild = RemoteChild
> {
  readonly type: Type;
  readonly props: Props;
  readonly allowedChildren: AllowedChildren;
}

export type PropsForRemoteComponent<T> = T extends RemoteComponentType<
  any,
  infer Props,
  any
>
  ? Props
  : never;

export type AllowedChildrenForRemoteComponent<
  T
> = T extends RemoteComponentType<any, any, infer Children> ? Children : never;
