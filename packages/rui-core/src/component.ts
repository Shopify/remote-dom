import {RemoteComponentType, RemoteChild} from '@shopify/rui-types';

export function createRemoteComponent<
  Type extends string,
  Props = {},
  AllowedChildren extends
    | RemoteComponentType<any, any>
    | RemoteChild = RemoteChild
>(componentType: Type): RemoteComponentType<Type, Props, AllowedChildren> {
  return componentType as any;
}
